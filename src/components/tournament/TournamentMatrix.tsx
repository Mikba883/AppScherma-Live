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
  tournamentId: string | null;
  gymId: string | null;
}

export const TournamentMatrix = ({
  athletes,
  matches,
  onRefresh,
  onFinish,
  onExit,
  currentUserId,
  isCreator,
  isLoading,
  tournamentId,
  gymId
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
            matchId: match.id,
            athleteA: athleteAData,
            athleteB: athleteBData
          });
        }
      });
      
      // Converti in array ordinato per numero turno
      return Array.from(roundsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, matches]) => ({ 
          round, 
          matches: matches.sort((a, b) => a.matchId.localeCompare(b.matchId))
        }));
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

  // Everyone can see all matches
  const visibleRounds = useMemo(() => {
    return generateRounds();
  }, [athletes, matches]);

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
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            Classifica
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] sm:w-[60px] text-xs sm:text-sm">Pos.</TableHead>
                  <TableHead className="text-xs sm:text-sm">Atleta</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm whitespace-nowrap">V/M</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm whitespace-nowrap">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAthletes.map((athlete, index) => {
                  const stats = getAthleteStats(athlete.id);
                  return (
                    <TableRow key={athlete.id}>
                      <TableCell className="font-bold p-2 sm:p-4">
                        <Badge variant={index === 0 ? 'default' : 'outline'} className="text-xs">
                          {index + 1}°
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium p-2 sm:p-4 text-xs sm:text-sm">
                        {athlete.full_name}
                      </TableCell>
                      
                      {/* Colonna V/M - più compatta su mobile */}
                      <TableCell className="text-center font-semibold p-2 sm:p-4">
                        <div className="text-sm sm:text-base">
                          {stats.wins}/{stats.totalMatches}
                        </div>
                      </TableCell>
                      
                      {/* Colonna Diff Stoccate - nasconde dettagli su mobile */}
                      <TableCell className="text-center p-2 sm:p-4">
                        <Badge 
                          variant={stats.pointsDiff > 0 ? 'default' : stats.pointsDiff < 0 ? 'secondary' : 'outline'}
                          className="text-xs sm:text-sm"
                        >
                          {stats.pointsDiff > 0 ? '+' : ''}{stats.pointsDiff}
                        </Badge>
                        <div className="hidden sm:block text-xs text-muted-foreground mt-1">
                          ({stats.pointsFor}/{stats.pointsAgainst})
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
        <CardHeader className="space-y-3">
          <CardTitle className="text-base sm:text-lg">Organizzazione Turni</CardTitle>
          <Badge variant="outline" className="text-sm sm:text-base w-fit">
            {completedMatches} / {totalMatches} match giocati
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {visibleRounds.map(round => (
            <div key={round.round} className="space-y-3">
              <h3 className="font-semibold text-lg">Turno {round.round}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {round.matches.map(({ athleteA, athleteB }) => {
                  const match = getMatch(athleteA.id, athleteB.id);
                  const canEdit = true;

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
                    currentUserId={currentUserId}
                    isInstructor={isInstructor}
                    isCreator={isCreator}
                    onSaved={onRefresh}
                    tournamentId={tournamentId}
                    gymId={gymId}
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

      {/* Action Buttons - Sticky su mobile */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-4 -mx-4 sm:mx-0 sm:static sm:border-0 sm:p-0">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Aggiorna</span>
            <span className="sm:hidden">Aggiorna Dati</span>
          </Button>
          
          {isCreator && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="destructive"
                    size="lg"
                    className="w-full sm:w-auto order-last sm:order-none"
                  >
                    <X className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Cancella Torneo</span>
                    <span className="sm:hidden">Cancella</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conferma Cancellazione</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sei sicuro di voler cancellare questo torneo? Tutti i match verranno cancellati e questa azione non può essere annullata.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onExit} 
                      className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancella Torneo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Salva e Chiudi</span>
                    <span className="sm:hidden">Chiudi Torneo</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conferma Salvataggio</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sei sicuro di voler salvare e chiudere il torneo? I match completati saranno registrati e il torneo verrà chiuso.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={onFinish} className="w-full sm:w-auto">
                      Salva e Chiudi
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
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
  currentUserId: string | null;
  isInstructor: boolean;
  isCreator: boolean;
  onSaved: () => void;
  tournamentId: string | null;
  gymId: string | null;
}

const MatchInputs = ({
  match,
  athleteAId,
  athleteBId,
  athleteAName,
  athleteBName,
  canEdit,
  currentUserId,
  isInstructor,
  isCreator,
  onSaved,
  tournamentId,
  gymId
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

  // Check if current user is a participant
  const isAthleteA = match?.athleteA === currentUserId;
  const isAthleteB = match?.athleteB === currentUserId;
  const isParticipant = isAthleteA || isAthleteB;

  // Only instructors can approve from tournament matrix
  const canApprove = match?.status === 'pending' 
                  && isParticipant 
                  && isInstructor
                  && match?.scoreA !== null
                  && match?.scoreB !== null;

  const handleSave = async () => {
    const scoreANum = scoreA === '' ? null : parseInt(scoreA);
    const scoreBNum = scoreB === '' ? null : parseInt(scoreB);

    // Validazione: se uno dei due è compilato, devono essere entrambi compilati
    if ((scoreA !== '' && scoreB === '') || (scoreA === '' && scoreB !== '')) {
      return;
    }

    // Validazione numeri
    if (scoreA !== '' && isNaN(scoreANum!)) {
      return;
    }
    if (scoreB !== '' && isNaN(scoreBNum!)) {
      return;
    }

    if (!match?.id) {
      toast.error('Match non trovato');
      return;
    }

    try {
      // Status based on user role (instructor auto-approves)
      const newStatus = isInstructor ? 'approved' : 'pending';
      
      const updateData: any = {
        score_a: match.athleteA === athleteAId ? scoreANum : scoreBNum,
        score_b: match.athleteA === athleteAId ? scoreBNum : scoreANum,
        weapon: weapon,
        status: newStatus,
      };

      // If instructor saves, auto-approve
      if (isInstructor) {
        updateData.approved_by = currentUserId;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bouts')
        .update(updateData)
        .eq('id', match.id);

      if (error) throw error;

      // Se è uno studente (status = pending), invia notifiche ad entrambi gli atleti
      if (newStatus === 'pending' && tournamentId && gymId) {
        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('name, tournament_date')
          .eq('id', tournamentId)
          .single();
        
        const notificationMessage = `È stato registrato un risultato per il match del torneo "${tournamentData?.name || 'Torneo'}". Approva per confermare.`;
        
        // Notifica per atleta A
        await supabase.from('notifications').insert({
          athlete_id: athleteAId,
          title: 'Match da Approvare',
          message: notificationMessage,
          type: 'info',
          created_by: currentUserId,
          related_bout_id: match.id,
          gym_id: gymId
        });
        
        // Notifica per atleta B
        await supabase.from('notifications').insert({
          athlete_id: athleteBId,
          title: 'Match da Approvare',
          message: notificationMessage,
          type: 'info',
          created_by: currentUserId,
          related_bout_id: match.id,
          gym_id: gymId
        });
      }

      onSaved();
    } catch (error: any) {
      toast.error('Errore nel salvataggio: ' + error.message);
    }
  };

  const handleApprove = async () => {
    if (!match?.id) return;
    
    try {
      const { error } = await supabase.rpc('approve_tournament_match', {
        _bout_id: match.id
      });
      
      if (error) throw error;
      
      toast.success('Match approvato!');
      onSaved();
    } catch (error: any) {
      toast.error('Errore nell\'approvazione: ' + error.message);
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

      {/* Approval button for athletes */}
      {canApprove && (
        <Button 
          onClick={handleApprove}
          className="w-full"
          size="sm"
        >
          Approva Match
        </Button>
      )}

      {match?.status === 'approved' && (
        <Badge variant="default" className="w-full justify-center text-xs mt-2">
          ✓ Match Approvato
        </Badge>
      )}
    </div>
  );
};
