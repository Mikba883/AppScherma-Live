import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { toast } from 'sonner';
import { Trophy, Save, X, RefreshCw } from 'lucide-react';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { useUserRoleOptimized } from '@/hooks/useUserRoleOptimized';
import { cn } from '@/lib/utils';

interface TournamentMatrixProps {
  athletes: TournamentAthlete[];
  matches: TournamentMatch[];
  onRefresh: () => void;
  onFinish: () => void;
  onExit: () => void;
  currentUserId: string | null;
  isCreator: boolean;
  isLoading: boolean;
}

export const TournamentMatrix = ({
  athletes,
  matches,
  onRefresh,
  onFinish,
  onExit,
  currentUserId,
  isCreator,
  isLoading
}: TournamentMatrixProps) => {
  const { role } = useUserRoleOptimized();
  
  const isInstructor = role === 'istruttore' || role === 'capo_palestra';

  // Get match between two athletes
  const getMatch = (athleteAId: string, athleteBId: string): TournamentMatch | undefined => {
    return matches.find(m =>
      (m.athleteA === athleteAId && m.athleteB === athleteBId) ||
      (m.athleteA === athleteBId && m.athleteB === athleteAId)
    );
  };

  // Calculate athlete stats
  const getAthleteStats = (athleteId: string) => {
    let wins = 0;
    let totalMatches = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    matches.forEach(match => {
      if (match.scoreA === null || match.scoreB === null) return;

      if (match.athleteA === athleteId) {
        totalMatches++;
        pointsFor += match.scoreA;
        pointsAgainst += match.scoreB;
        if (match.scoreA > match.scoreB) wins++;
      } else if (match.athleteB === athleteId) {
        totalMatches++;
        pointsFor += match.scoreB;
        pointsAgainst += match.scoreA;
        if (match.scoreB > match.scoreA) wins++;
      }
    });

    return {
      wins,
      totalMatches,
      pointsFor,
      pointsAgainst,
      pointsDiff: pointsFor - pointsAgainst
    };
  };

  // Helper function to calculate round-robin from existing matches
  const calculateRoundRobinFromExistingMatches = (
    athletes: TournamentAthlete[], 
    existingMatches: TournamentMatch[]
  ) => {
    let athletesList = [...athletes];
    
    // Add BYE if odd number of athletes
    if (athletes.length % 2 === 1) {
      athletesList.push({ id: 'bye', full_name: 'BYE' });
    }

    const numAthletes = athletesList.length;
    const totalRounds = numAthletes - 1;
    const rounds = [];

    for (let round = 0; round < totalRounds; round++) {
      const roundMatches = [];
      
      for (let i = 0; i < numAthletes / 2; i++) {
        const athlete1 = athletesList[i];
        const athlete2 = athletesList[numAthletes - 1 - i];
        
        if (athlete1.id !== 'bye' && athlete2.id !== 'bye') {
          // Find the existing match between these two athletes
          const existingMatch = existingMatches.find(m =>
            (m.athleteA === athlete1.id && m.athleteB === athlete2.id) ||
            (m.athleteA === athlete2.id && m.athleteB === athlete1.id)
          );
          
          if (existingMatch) {
            roundMatches.push({
              athleteA: athlete1,
              athleteB: athlete2
            });
          }
        }
      }
      
      if (roundMatches.length > 0) {
        rounds.push({
          round: round + 1,
          matches: roundMatches
        });
      }

      // Rotate athletes (keep first fixed)
      const temp = athletesList[1];
      for (let i = 1; i < numAthletes - 1; i++) {
        athletesList[i] = athletesList[i + 1];
      }
      athletesList[numAthletes - 1] = temp;
    }

    return rounds;
  };

  // Generate round-robin rounds
  const generateRounds = () => {
    // CASO 1: Se i match hanno round_number, usalo (FISSO!)
    if (matches.length > 0 && matches.some(m => m.round_number !== null && m.round_number !== undefined)) {
      const roundsMap = new Map<number, any[]>();
      
      matches.forEach(match => {
        const roundNum = match.round_number || 1;
        if (!roundsMap.has(roundNum)) {
          roundsMap.set(roundNum, []);
        }
        
        const athleteAData = athletes.find(a => a.id === match.athleteA);
        const athleteBData = athletes.find(a => a.id === match.athleteB);
        
        if (athleteAData && athleteBData) {
          roundsMap.get(roundNum)!.push({
            athleteA: athleteAData,
            athleteB: athleteBData
          });
        }
      });
      
      // Converti in array ordinato per numero turno
      return Array.from(roundsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, matches]) => ({ round, matches }));
    }
    
    // CASO 2: Ricalcola con algoritmo round-robin e assegna round_number
    const rounds = calculateRoundRobinFromExistingMatches(athletes, matches);
    assignRoundNumbersToMatches(rounds);
    return rounds;
  };

  // Helper function to assign round_number to existing matches
  const assignRoundNumbersToMatches = async (rounds: any[]) => {
    try {
      for (const round of rounds) {
        for (const matchData of round.matches) {
          const match = getMatch(matchData.athleteA.id, matchData.athleteB.id);
          if (match?.id) {
            await supabase
              .from('bouts')
              .update({ round_number: round.round })
              .eq('id', match.id);
          }
        }
      }
    } catch (error) {
      console.error('Error assigning round numbers:', error);
    }
  };

  // Filter rounds based on user role
  const visibleRounds = useMemo(() => {
    const allRounds = generateRounds();

    if (isInstructor) {
      return allRounds; // Organizer sees all
    }

    // Athlete sees only their matches
    return allRounds
      .map(round => ({
        ...round,
        matches: round.matches.filter(m =>
          m.athleteA.id === currentUserId || m.athleteB.id === currentUserId
        )
      }))
      .filter(round => round.matches.length > 0);
  }, [athletes, isInstructor, currentUserId]);

  // Sort athletes by ranking
  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      const statsA = getAthleteStats(a.id);
      const statsB = getAthleteStats(b.id);
      
      if (statsA.wins !== statsB.wins) {
        return statsB.wins - statsA.wins;
      }
      
      return statsB.pointsDiff - statsA.pointsDiff;
    });
  }, [athletes, matches]);

  const { completedMatches, totalMatches } = useMemo(() => {
    const completed = matches.filter(m => m.scoreA !== null && m.scoreB !== null).length;
    const total = matches.length;
    
    return {
      completedMatches: completed,
      totalMatches: total
    };
  }, [matches]);

  return (
    <div className="space-y-6">
      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Classifica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Pos.</TableHead>
                <TableHead>Atleta</TableHead>
                <TableHead className="text-center">V/M</TableHead>
                <TableHead className="text-center">Diff Stoccate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAthletes.map((athlete, index) => {
                const stats = getAthleteStats(athlete.id);
                return (
                  <TableRow key={athlete.id}>
                    <TableCell className="font-bold">
                      <Badge variant={index === 0 ? 'default' : 'outline'}>
                        {index + 1}°
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{athlete.full_name}</TableCell>
                    
                    {/* Colonna V/M */}
                    <TableCell className="text-center font-semibold">
                      {stats.wins} / {stats.totalMatches}
                    </TableCell>
                    
                    {/* Colonna Diff Stoccate */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant={stats.pointsDiff > 0 ? 'default' : stats.pointsDiff < 0 ? 'secondary' : 'outline'}>
                          {stats.pointsDiff > 0 ? '+' : ''}{stats.pointsDiff}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({stats.pointsFor}/{stats.pointsAgainst})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tournament Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matrice Torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Atleta</TableHead>
                  {athletes.map(athlete => (
                    <TableHead key={athlete.id} className="text-center min-w-[80px]">
                      {athlete.full_name.split(' ')[0]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {athletes.map(athleteA => (
                  <TableRow key={athleteA.id}>
                    <TableCell className="font-medium">{athleteA.full_name}</TableCell>
                    {athletes.map(athleteB => {
                      if (athleteA.id === athleteB.id) {
                        return <TableCell key={athleteB.id} className="text-center bg-gray-100 dark:bg-gray-800">-</TableCell>;
                      }

                      const match = getMatch(athleteA.id, athleteB.id);
                      const scoreA = match?.athleteA === athleteA.id ? match.scoreA : match?.scoreB;
                      const scoreB = match?.athleteA === athleteA.id ? match.scoreB : match?.scoreA;

                      return (
                        <TableCell key={athleteB.id} className="text-center">
                          {scoreA !== null && scoreB !== null ? (
                            <Badge variant={scoreA > scoreB ? 'default' : 'secondary'}>
                              {scoreA} - {scoreB}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Organization Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organizzazione Turni</CardTitle>
            <Badge variant="outline" className="text-base">
              {completedMatches} / {totalMatches} match giocati
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visibleRounds.map(round => (
            <div key={round.round} className="space-y-3">
              <h3 className="font-semibold text-lg">Turno {round.round}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {round.matches.map(({ athleteA, athleteB }) => {
                  const match = getMatch(athleteA.id, athleteB.id);
                  const canEdit = isInstructor || 
                                 athleteA.id === currentUserId || 
                                 athleteB.id === currentUserId;

                  return (
                    <Card key={`${athleteA.id}-${athleteB.id}`}>
                      <CardContent className="p-4">
                        <div className="font-medium mb-3 text-center">
                          {athleteA.full_name} vs {athleteB.full_name}
                        </div>
                        <MatchInputs
                          key={`${athleteA.id}-${athleteB.id}-${match?.id || 'new'}`}
                          match={match}
                          athleteAId={athleteA.id}
                          athleteBId={athleteB.id}
                          athleteAName={athleteA.full_name}
                          athleteBName={athleteB.full_name}
                          canEdit={canEdit}
                          onSaved={onRefresh}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
        
        {isCreator && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isLoading}
                variant="destructive"
                size="lg"
              >
                <X className="w-4 h-4 mr-2" />
                Cancella Torneo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Conferma Cancellazione</AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler cancellare questo torneo? Tutti i match verranno cancellati e questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={onExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Cancella Torneo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {isCreator && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isLoading}
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Salva e Chiudi
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Conferma Salvataggio</AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler salvare e chiudere il torneo? I match completati saranno registrati e il torneo verrà chiuso.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={onFinish}>
                  Salva e Chiudi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

// Match Input Component
interface MatchInputsProps {
  match: TournamentMatch | undefined;
  athleteAId: string;
  athleteBId: string;
  athleteAName: string;
  athleteBName: string;
  canEdit: boolean;
  onSaved: () => void;
}

const MatchInputs = ({
  match,
  athleteAId,
  athleteBId,
  athleteAName,
  athleteBName,
  canEdit,
  onSaved
}: MatchInputsProps) => {
  // Helper to get score for specific athlete
  const getScoreForAthlete = (targetAthleteId: string): number | null => {
    if (!match) return null;
    return match.athleteA === targetAthleteId ? match.scoreA : match.scoreB;
  };

  // Controlled state for inputs
  const [scoreA, setScoreA] = useState(getScoreForAthlete(athleteAId)?.toString() || '');
  const [scoreB, setScoreB] = useState(getScoreForAthlete(athleteBId)?.toString() || '');
  const [weapon, setWeapon] = useState(match?.weapon || 'fioretto');

  // Sync state when match data changes (after refresh)
  useEffect(() => {
    setScoreA(getScoreForAthlete(athleteAId)?.toString() || '');
    setScoreB(getScoreForAthlete(athleteBId)?.toString() || '');
    setWeapon(match?.weapon || 'fioretto');
  }, [match, athleteAId, athleteBId]);

  // Check if match is complete
  const isComplete = scoreA !== '' && scoreB !== '';

  const handleSave = async () => {
    const scoreANum = scoreA === '' ? null : parseInt(scoreA);
    const scoreBNum = scoreB === '' ? null : parseInt(scoreB);

    // Validazione: se uno dei due è compilato, devono essere entrambi compilati
    if ((scoreA !== '' && scoreB === '') || (scoreA === '' && scoreB !== '')) {
      toast.error('Compila entrambi i punteggi o lascia vuoti entrambi');
      return;
    }

    // Validazione numeri
    if (scoreA !== '' && isNaN(scoreANum!)) {
      toast.error('Inserisci punteggi validi');
      return;
    }
    if (scoreB !== '' && isNaN(scoreBNum!)) {
      toast.error('Inserisci punteggi validi');
      return;
    }

    if (!match?.id) {
      toast.error('Match non trovato');
      return;
    }

    try {
      const { error } = await supabase
        .from('bouts')
        .update({
          score_a: match.athleteA === athleteAId ? scoreANum : scoreBNum,
          score_b: match.athleteA === athleteAId ? scoreBNum : scoreANum,
          weapon: weapon,
          status: 'pending'
        })
        .eq('id', match.id);

      if (error) throw error;

      toast.success(scoreANum === null ? 'Match cancellato' : 'Match salvato');
      onSaved();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  return (
    <div className={cn(
      "space-y-3 p-3 rounded-lg border-2 transition-colors",
      isComplete ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-border"
    )}>
      <Select
        value={weapon}
        onValueChange={setWeapon}
        disabled={!canEdit}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleziona arma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fioretto">Fioretto</SelectItem>
          <SelectItem value="spada">Spada</SelectItem>
          <SelectItem value="sciabola">Sciabola</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder={athleteAName.split(' ')[0]}
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          onBlur={handleSave}
          disabled={!canEdit}
          min="0"
          max="45"
        />
        
        <Input
          type="number"
          placeholder={athleteBName.split(' ')[0]}
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          onBlur={handleSave}
          disabled={!canEdit}
          min="0"
          max="45"
        />
      </div>

      {!canEdit && (
        <p className="text-xs text-muted-foreground text-center">
          Solo visualizzazione
        </p>
      )}
    </div>
  );
};
