import { useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trophy, Save, X } from 'lucide-react';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { useUserRoleOptimized } from '@/hooks/useUserRoleOptimized';

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
    const completedMatches = matches.filter(m => m.scoreA !== null && m.scoreB !== null).length;
    const totalMatches = matches.length;
    
    if (completedMatches < totalMatches) {
      toast.error(`Completa tutti i match prima di concludere il torneo (${completedMatches}/${totalMatches})`);
      return;
    }
    
    setShowFinishDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Organization Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organizzazione Turni</CardTitle>
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
                        return <TableCell key={athleteB.id} className="text-center">-</TableCell>;
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
                <TableHead className="text-center">V</TableHead>
                <TableHead className="text-center">M</TableHead>
                <TableHead className="text-center">PF</TableHead>
                <TableHead className="text-center">PS</TableHead>
                <TableHead className="text-center">Diff</TableHead>
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
                    <TableCell className="text-center">{stats.wins}</TableCell>
                    <TableCell className="text-center">{stats.totalMatches}</TableCell>
                    <TableCell className="text-center">{stats.pointsFor}</TableCell>
                    <TableCell className="text-center">{stats.pointsAgainst}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={stats.pointsDiff > 0 ? 'default' : 'secondary'}>
                        {stats.pointsDiff > 0 ? '+' : ''}{stats.pointsDiff}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          onClick={onExit}
          variant="outline"
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Esci
        </Button>
        
        {(isCreator || isInstructor) && (
          <Button
            onClick={handleFinishClick}
            disabled={isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            Concludi Torneo
          </Button>
        )}
      </div>

      {/* Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concludere il torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i match saranno approvati e il torneo verrà chiuso.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={onFinish}>
              Conferma
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
  const scoreARef = useRef<HTMLInputElement>(null);
  const scoreBRef = useRef<HTMLInputElement>(null);
  const [weapon, setWeapon] = useState(match?.weapon || 'fioretto');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const scoreAValue = scoreARef.current?.value;
    const scoreBValue = scoreBRef.current?.value;

    if (!scoreAValue || !scoreBValue) return;

    const scoreA = parseInt(scoreAValue);
    const scoreB = parseInt(scoreBValue);

    if (isNaN(scoreA) || isNaN(scoreB)) {
      toast.error('Inserisci punteggi validi');
      return;
    }

    if (!match?.id) {
      toast.error('Match non trovato');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('[MatchInputs] Saving match:', {
        matchId: match.id,
        scoreA,
        scoreB,
        weapon
      });

      const { error } = await supabase
        .from('bouts')
        .update({
          score_a: match.athleteA === athleteAId ? scoreA : scoreB,
          score_b: match.athleteA === athleteAId ? scoreB : scoreA,
          weapon: weapon,
          status: 'pending'
        })
        .eq('id', match.id);

      if (error) throw error;

      console.log('[MatchInputs] Match saved successfully');
      toast.success('Match salvato');
      onSaved();
    } catch (error: any) {
      console.error('[MatchInputs] Error saving match:', error);
      toast.error('Errore nel salvataggio: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Determine scores based on athlete order
  const getScoreForAthlete = (targetAthleteId: string): number | null => {
    if (!match) return null;
    return match.athleteA === targetAthleteId ? match.scoreA : match.scoreB;
  };

  return (
    <div className="space-y-3">
      <Select
        value={weapon}
        onValueChange={setWeapon}
        disabled={isSaving || !canEdit}
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
          ref={scoreARef}
          type="number"
          placeholder={athleteAName.split(' ')[0]}
          defaultValue={getScoreForAthlete(athleteAId) || ''}
          onBlur={handleSave}
          disabled={isSaving || !canEdit}
          min="0"
          max="45"
        />
        
        <Input
          ref={scoreBRef}
          type="number"
          placeholder={athleteBName.split(' ')[0]}
          defaultValue={getScoreForAthlete(athleteBId) || ''}
          onBlur={handleSave}
          disabled={isSaving || !canEdit}
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
