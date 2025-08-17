import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trophy, Save, RotateCcw, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';

interface TournamentMatrixProps {
  athletes: TournamentAthlete[];
  matches: TournamentMatch[];
  onUpdateMatch: (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => void;
  onResetTournament: () => void;
}

export const TournamentMatrix = ({ athletes, matches, onUpdateMatch, onResetTournament }: TournamentMatrixProps) => {
  const [saving, setSaving] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const navigate = useNavigate();

  const getMatch = (athleteA: string, athleteB: string): TournamentMatch | undefined => {
    return matches.find(match => 
      (match.athleteA === athleteA && match.athleteB === athleteB) ||
      (match.athleteA === athleteB && match.athleteB === athleteA)
    );
  };

  const getAthleteStats = (athleteId: string) => {
    let wins = 0;
    let totalMatches = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    matches.forEach(match => {
      if ((match.athleteA === athleteId || match.athleteB === athleteId) && 
          match.scoreA !== null && match.scoreB !== null) {
        totalMatches++;
        
        if (match.athleteA === athleteId) {
          pointsFor += match.scoreA;
          pointsAgainst += match.scoreB;
          if (match.scoreA > match.scoreB) wins++;
        } else {
          pointsFor += match.scoreB;
          pointsAgainst += match.scoreA;
          if (match.scoreB > match.scoreA) wins++;
        }
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

  const handleScoreChange = (athleteA: string, athleteB: string, scoreA: string, scoreB: string, weapon: string) => {
    const numScoreA = scoreA === '' ? null : parseInt(scoreA);
    const numScoreB = scoreB === '' ? null : parseInt(scoreB);
    
    // Update both directions of the match
    onUpdateMatch(athleteA, athleteB, numScoreA, numScoreB, weapon || null);
    
    // Also update the reverse match with swapped scores
    if (numScoreA !== null && numScoreB !== null) {
      onUpdateMatch(athleteB, athleteA, numScoreB, numScoreA, weapon || null);
    }
  };

  // Generate rounds for tournament organization
  const generateRounds = () => {
    const rounds: { round: number; matches: Array<{athleteA: TournamentAthlete; athleteB: TournamentAthlete}> }[] = [];
    const totalAthletes = athletes.length;
    
    // Round-robin tournament: each athlete plays every other athlete once
    for (let round = 1; round < totalAthletes; round++) {
      const roundMatches: Array<{athleteA: TournamentAthlete; athleteB: TournamentAthlete}> = [];
      
      for (let i = 0; i < Math.floor(totalAthletes / 2); i++) {
        const athlete1Index = i;
        const athlete2Index = (totalAthletes - 1 - i + round - 1) % (totalAthletes - 1);
        const finalAthlete2Index = athlete2Index >= totalAthletes - 1 ? totalAthletes - 1 : athlete2Index;
        
        if (athlete1Index !== finalAthlete2Index && athlete1Index < totalAthletes && finalAthlete2Index < totalAthletes) {
          roundMatches.push({
            athleteA: athletes[athlete1Index],
            athleteB: athletes[finalAthlete2Index]
          });
        }
      }
      
      if (roundMatches.length > 0) {
        rounds.push({ round, matches: roundMatches });
      }
    }
    
    return rounds;
  };

  const rounds = generateRounds();

  const getCompletedMatches = () => {
    return matches.filter(match => match.scoreA !== null && match.scoreB !== null && match.weapon !== null).length;
  };

  const getTotalMatches = () => {
    return matches.length;
  };

  const handleSaveResults = async () => {
    const completedMatches = matches.filter(match => 
      match.scoreA !== null && match.scoreB !== null && match.weapon !== null
    );

    if (completedMatches.length === 0) {
      toast.error('Nessun incontro completato da salvare');
      return;
    }

    setSaving(true);
    
    try {
      // Save each completed match
      for (const match of completedMatches) {
        const { error } = await supabase.rpc('register_bout_instructor', {
          _athlete_a: match.athleteA,
          _athlete_b: match.athleteB,
          _bout_date: new Date().toISOString().split('T')[0],
          _weapon: match.weapon,
          _bout_type: 'gara',
          _score_a: match.scoreA!,
          _score_b: match.scoreB!
        });

        if (error) {
          console.error('Error saving match:', error);
          throw new Error(`Errore nel salvare l'incontro: ${error.message}`);
        }
      }

      toast.success(`${completedMatches.length} incontri salvati con successo!`);
      navigate('/');
    } catch (error) {
      console.error('Error saving tournament results:', error);
      toast.error('Errore nel salvare i risultati del torneo');
    } finally {
      setSaving(false);
    }
  };

  // Sort athletes by their stats for ranking
  const sortedAthletes = [...athletes].sort((a, b) => {
    const statsA = getAthleteStats(a.id);
    const statsB = getAthleteStats(b.id);
    
    // Sort by wins, then by points difference
    if (statsA.wins !== statsB.wins) {
      return statsB.wins - statsA.wins;
    }
    return statsB.pointsDiff - statsA.pointsDiff;
  });

  return (
    <div className="space-y-6">
      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Torneo in Corso - {athletes.length} Atleti
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {getCompletedMatches()}/{getTotalMatches()} incontri completati
              </Badge>
              <Button 
                onClick={() => setShowFinishDialog(true)}
                className="flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                FINE
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tournament Matrix */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Matrice Incontri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                     <TableRow>
                       <TableHead className="w-40">Atleta</TableHead>
                       {athletes.map((athlete) => (
                         <TableHead key={athlete.id} className="text-center min-w-24 text-xs">
                           {athlete.full_name}
                         </TableHead>
                       ))}
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {athletes.map((athleteA) => (
                      <TableRow key={athleteA.id}>
                        <TableCell className="font-medium text-sm">
                          {athleteA.full_name}
                        </TableCell>
                        {athletes.map((athleteB) => (
                          <TableCell key={athleteB.id} className="p-1">
                            {athleteA.id === athleteB.id ? (
                              <div className="w-20 h-16 bg-muted rounded flex items-center justify-center">
                                <Target className="w-4 h-4 text-muted-foreground" />
                              </div>
                            ) : (
                              <MatchCell
                                athleteA={athleteA.id}
                                athleteB={athleteB.id}
                                match={getMatch(athleteA.id, athleteB.id)}
                                onUpdate={handleScoreChange}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Classifica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedAthletes.map((athlete, index) => {
                  const stats = getAthleteStats(athlete.id);
                  return (
                    <div key={athlete.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}°
                        </Badge>
                        <div>
                          <div className="font-medium text-sm">{athlete.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {stats.wins}/{stats.totalMatches} vittorie
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          {stats.pointsDiff > 0 ? '+' : ''}{stats.pointsDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stats.pointsFor}-{stats.pointsAgainst}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tournament Rounds */}
      <Card>
        <CardHeader>
          <CardTitle>Organizzazione Turni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rounds.map(({ round, matches }) => (
              <div key={round} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Turno {round}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matches.map((match, index) => {
                    const matchData = getMatch(match.athleteA.id, match.athleteB.id);
                    const isCompleted = matchData?.scoreA !== null && matchData?.scoreB !== null;
                    return (
                      <div key={index} className={`p-3 rounded border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        <div className="text-sm font-medium">
                          {match.athleteA.full_name} vs {match.athleteB.full_name}
                        </div>
                        {isCompleted && (
                          <div className="text-xs text-gray-600 mt-1">
                            {matchData.scoreA} - {matchData.scoreB} ({matchData.weapon})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizza Torneo</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi salvare i risultati del torneo? Sono stati completati {getCompletedMatches()} incontri su {getTotalMatches()}.
              {getCompletedMatches() > 0 && " I risultati saranno registrati nel database e i ranking aggiornati."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveResults}
              disabled={getCompletedMatches() === 0 || saving}
            >
              {saving ? 'Salvataggio...' : 'Sì, Salva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface MatchCellProps {
  athleteA: string;
  athleteB: string;
  match?: TournamentMatch;
  onUpdate: (athleteA: string, athleteB: string, scoreA: string, scoreB: string, weapon: string) => void;
}

const MatchCell = ({ athleteA, athleteB, match, onUpdate }: MatchCellProps) => {
  const [scoreA, setScoreA] = useState(match?.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState(match?.scoreB?.toString() || '');
  const [weapon, setWeapon] = useState(match?.weapon || 'fioretto');

  const handleUpdate = () => {
    onUpdate(athleteA, athleteB, scoreA, scoreB, weapon);
  };

  const isComplete = match?.scoreA !== null && match?.scoreB !== null && match?.weapon;
  const scoreANum = parseInt(scoreA) || 0;
  const scoreBNum = parseInt(scoreB) || 0;
  const isAWinning = isComplete && scoreANum > scoreBNum;
  const isBWinning = isComplete && scoreBNum > scoreANum;

  return (
    <div className="w-20 space-y-1">
      {/* Weapon */}
      <Select 
        value={weapon} 
        onValueChange={(value) => {
          setWeapon(value);
          onUpdate(athleteA, athleteB, scoreA, scoreB, value);
        }}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue placeholder="Arma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fioretto">F</SelectItem>
          <SelectItem value="spada">S</SelectItem>
          <SelectItem value="sciabola">C</SelectItem>
        </SelectContent>
      </Select>

      {/* Scores */}
      <div className="flex gap-1">
        <Input
          type="number"
          min="0"
          max="15"
          value={scoreA}
          onChange={(e) => {
            setScoreA(e.target.value);
            onUpdate(athleteA, athleteB, e.target.value, scoreB, weapon);
          }}
          className={`h-6 text-xs text-center p-1 ${
            isAWinning ? 'bg-green-100 border-green-300' : 
            isBWinning ? 'bg-red-100 border-red-300' : ''
          }`}
          placeholder="0"
        />
        <Input
          type="number"
          min="0"
          max="15"
          value={scoreB}
          onChange={(e) => {
            setScoreB(e.target.value);
            onUpdate(athleteA, athleteB, scoreA, e.target.value, weapon);
          }}
          className={`h-6 text-xs text-center p-1 ${
            isBWinning ? 'bg-green-100 border-green-300' : 
            isAWinning ? 'bg-red-100 border-red-300' : ''
          }`}
          placeholder="0"
        />
      </div>

      {isComplete && (
        <div className="h-1 bg-green-500 rounded w-full"></div>
      )}
    </div>
  );
};