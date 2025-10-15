import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  
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

  // Generate round-robin rounds
  const generateRounds = () => {
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
          roundMatches.push({
            athleteA: athlete1,
            athleteB: athlete2
          });
        }
      }
      
      rounds.push({
        round: round + 1,
        matches: roundMatches
      });

      // Rotate athletes (keep first fixed)
      const temp = athletesList[1];
      for (let i = 1; i < numAthletes - 1; i++) {
        athletesList[i] = athletesList[i + 1];
      }
      athletesList[numAthletes - 1] = temp;
    }

    return rounds;
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

  const handleFinishClick = () => {
    setShowFinishDialog(true);
  };

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
        <Button
          onClick={handleFinishClick}
          disabled={isLoading}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          Concludi Torneo
        </Button>
      </div>

      {/* Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Come vuoi concludere il torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Puoi salvare i match giocati e chiudere il torneo, oppure cancellare tutto senza salvare i risultati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3">
            <AlertDialogCancel 
              onClick={onExit}
              className="w-full sm:w-auto sm:flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancella (senza salvare)
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={onFinish}
              className="w-full sm:w-auto sm:flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Salva e Chiudi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  }, [match?.scoreA, match?.scoreB, match?.weapon]);

  // Check if match is complete
  const isComplete = scoreA !== '' && scoreB !== '';

  const handleSave = async () => {
    if (!scoreA || !scoreB) return;

    const scoreANum = parseInt(scoreA);
    const scoreBNum = parseInt(scoreB);

    if (isNaN(scoreANum) || isNaN(scoreBNum)) {
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

      toast.success('Match salvato');
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
