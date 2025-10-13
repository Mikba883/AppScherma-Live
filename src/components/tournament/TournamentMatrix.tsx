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
  onSaveResults?: (tournamentName: string, tournamentDate: string, weapon: string, boutType: string) => Promise<void>;
  saving?: boolean;
  isStudentMode?: boolean;
  currentUserId?: string | null;
  tournamentCreatorId?: string | null;
  activeTournamentId?: string | null;
  organizerRole?: 'instructor' | 'student';
}

export const TournamentMatrix = ({ 
  athletes, 
  matches, 
  onUpdateMatch, 
  onResetTournament,
  onSaveResults,
  saving: externalSaving,
  isStudentMode = false,
  currentUserId = null,
  tournamentCreatorId = null,
  activeTournamentId = null,
  organizerRole = 'student'
}: TournamentMatrixProps) => {
  const [saving, setSaving] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const navigate = useNavigate();
  
  const isSaving = externalSaving || saving;
  const isCreator = currentUserId && tournamentCreatorId && currentUserId === tournamentCreatorId;
  
  const canEditMatch = (athleteA: string, athleteB: string): boolean => {
    if (!currentUserId) return false;
    if (isCreator) return true;
    return athleteA === currentUserId || athleteB === currentUserId;
  };

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

    // Count each match only once by checking unique pairs
    const countedMatches = new Set<string>();

    matches.forEach(match => {
      if ((match.athleteA === athleteId || match.athleteB === athleteId) && 
          match.scoreA !== null && match.scoreB !== null) {
        
        // Create a unique key for this match (ordered by athlete IDs to avoid duplicates)
        const matchKey = [match.athleteA, match.athleteB].sort().join('-');
        
        // Only count if we haven't already counted this match
        if (!countedMatches.has(matchKey)) {
          countedMatches.add(matchKey);
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
    
    // Always update both directions of the match automatically
    onUpdateMatch(athleteA, athleteB, numScoreA, numScoreB, weapon || null);
  };

  // Generate rounds for tournament organization using correct round-robin algorithm
  const generateRounds = () => {
    const totalAthletes = athletes.length;
    if (totalAthletes < 2) return [];
    
    const rounds: { round: number; matches: Array<{athleteA: TournamentAthlete; athleteB: TournamentAthlete}> }[] = [];
    const totalRounds = totalAthletes % 2 === 0 ? totalAthletes - 1 : totalAthletes;
    
    // Create a copy of athletes array for rotation
    let athletesList = [...athletes];
    
    // If odd number of athletes, add a "bye" placeholder
    if (totalAthletes % 2 === 1) {
      athletesList.push({ id: 'bye', full_name: 'BYE' } as TournamentAthlete);
    }
    
    const numAthletes = athletesList.length;
    const half = numAthletes / 2;
    
    for (let round = 0; round < totalRounds; round++) {
      const roundMatches: Array<{athleteA: TournamentAthlete; athleteB: TournamentAthlete}> = [];
      
      for (let i = 0; i < half; i++) {
        const athlete1 = athletesList[i];
        const athlete2 = athletesList[numAthletes - 1 - i];
        
        // Skip if either athlete is the "bye" placeholder
        if (athlete1.id !== 'bye' && athlete2.id !== 'bye') {
          roundMatches.push({
            athleteA: athlete1,
            athleteB: athlete2
          });
        }
      }
      
      if (roundMatches.length > 0) {
        rounds.push({ round: round + 1, matches: roundMatches });
      }
      
      // Rotate athletes (keep first fixed, rotate others)
      if (numAthletes > 2) {
        const temp = athletesList[1];
        for (let i = 1; i < numAthletes - 1; i++) {
          athletesList[i] = athletesList[i + 1];
        }
        athletesList[numAthletes - 1] = temp;
      }
    }
    
    return rounds;
  };

  const rounds = generateRounds();

  const getCompletedMatches = () => {
    const countedMatches = new Set<string>();
    return matches.filter(match => {
      if (match.scoreA !== null && match.scoreB !== null && match.weapon !== null) {
        const matchKey = [match.athleteA, match.athleteB].sort().join('-');
        if (!countedMatches.has(matchKey)) {
          countedMatches.add(matchKey);
          return true;
        }
      }
      return false;
    }).length;
  };

  const getTotalMatches = () => {
    const countedMatches = new Set<string>();
    matches.forEach(match => {
      const matchKey = [match.athleteA, match.athleteB].sort().join('-');
      countedMatches.add(matchKey);
    });
    return countedMatches.size;
  };

  const handleSaveResults = async () => {
    if (isStudentMode && onSaveResults) {
      // For students, use the custom save handler
      const tournamentName = `Torneo ${new Date().toLocaleDateString('it-IT')}`;
      const tournamentDate = new Date().toISOString().split('T')[0];
      const firstMatch = matches.find(m => m.weapon);
      const weapon = firstMatch?.weapon || '';
      const boutType = 'sparring'; // Default for student tournaments
      
      await onSaveResults(tournamentName, tournamentDate, weapon, boutType);
      setShowFinishDialog(false);
      return;
    }
    
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
      
      // Reset tournament after successful save
      onResetTournament();
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
              {isCreator && (
                <Button 
                  onClick={() => setShowFinishDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  FINE
                </Button>
              )}
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
                               <ReadOnlyMatchCell
                                 athleteA={athleteA.id}
                                 athleteB={athleteB.id}
                                 match={getMatch(athleteA.id, athleteB.id)}
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
                       <div key={index} className={`p-4 rounded border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                         <div className="text-sm font-medium mb-3">
                           {match.athleteA.full_name} vs {match.athleteB.full_name}
                         </div>
                           <MatchInputs
                            athleteA={match.athleteA.id}
                            athleteB={match.athleteB.id}
                            athleteAName={match.athleteA.full_name}
                            athleteBName={match.athleteB.full_name}
                            match={matchData}
                            onUpdate={handleScoreChange}
                            canEdit={canEditMatch(match.athleteA.id, match.athleteB.id)}
                          />
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
              Vuoi salvare il torneo? Sono stati completati {getCompletedMatches()} incontri su {getTotalMatches()}.
              <br /><br />
              {organizerRole === 'instructor' ? (
                <strong>Come istruttore, i risultati saranno registrati immediatamente nel database e i ranking aggiornati.</strong>
              ) : (
                <strong>Come allievo, gli atleti coinvolti dovranno approvare i loro match prima che vengano registrati.</strong>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveResults}
              disabled={getCompletedMatches() === 0 || isSaving}
            >
              {isSaving ? 'Salvataggio...' : 'Sì, Salva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Read-only matrix cell component
interface ReadOnlyMatchCellProps {
  athleteA: string;
  athleteB: string;
  match?: TournamentMatch;
}

const ReadOnlyMatchCell = ({ athleteA, athleteB, match }: ReadOnlyMatchCellProps) => {
  const isComplete = match?.scoreA !== null && match?.scoreB !== null && match?.weapon;
  
  if (!isComplete) {
    return (
      <div className="w-20 h-16 bg-muted rounded flex items-center justify-center">
        <div className="text-xs text-muted-foreground">-</div>
      </div>
    );
  }

  // Determine if the match orientation matches the cell orientation
  const isMatchOriented = match.athleteA === athleteA && match.athleteB === athleteB;
  
  // Get scores in the correct orientation for this cell
  const scoreForA = isMatchOriented ? match.scoreA! : match.scoreB!;
  const scoreForB = isMatchOriented ? match.scoreB! : match.scoreA!;
  
  const isAWinning = scoreForA > scoreForB;
  const isBWinning = scoreForB > scoreForA;

  return (
    <div className="w-20 h-16 rounded border flex flex-col items-center justify-center p-1">
      <div className="text-xs mb-1">{match.weapon?.charAt(0).toUpperCase()}</div>
      <div className="flex gap-1 text-xs">
        <span className={`${isAWinning ? 'text-green-600 font-bold' : isBWinning ? 'text-red-600' : ''}`}>
          {scoreForA}
        </span>
        <span>-</span>
        <span className={`${isBWinning ? 'text-green-600 font-bold' : isAWinning ? 'text-red-600' : ''}`}>
          {scoreForB}
        </span>
      </div>
    </div>
  );
};

// Match input component for the turns section
interface MatchInputsProps {
  athleteA: string;
  athleteB: string;
  athleteAName: string;
  athleteBName: string;
  match?: TournamentMatch;
  onUpdate: (athleteA: string, athleteB: string, scoreA: string, scoreB: string, weapon: string) => void;
  canEdit?: boolean;
}

const MatchInputs = ({ athleteA, athleteB, athleteAName, athleteBName, match, onUpdate, canEdit = true }: MatchInputsProps) => {
  const [scoreA, setScoreA] = useState(match?.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState(match?.scoreB?.toString() || '');
  const [weapon, setWeapon] = useState(match?.weapon || 'fioretto');

  const isComplete = match?.scoreA !== null && match?.scoreB !== null && match?.weapon;
  const scoreANum = parseInt(scoreA) || 0;
  const scoreBNum = parseInt(scoreB) || 0;
  const isAWinning = isComplete && scoreANum > scoreBNum;
  const isBWinning = isComplete && scoreBNum > scoreANum;

  if (!canEdit && isComplete) {
    return (
      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <div className="text-xs text-muted-foreground">Arma: {weapon}</div>
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <div className="font-medium">{athleteAName}</div>
            <div className={`text-2xl ${isAWinning ? 'text-green-600 font-bold' : 'text-red-600'}`}>
              {scoreA}
            </div>
          </div>
          <div className="text-muted-foreground">-</div>
          <div className="text-sm text-right">
            <div className="font-medium">{athleteBName}</div>
            <div className={`text-2xl ${isBWinning ? 'text-green-600 font-bold' : 'text-red-600'}`}>
              {scoreB}
            </div>
          </div>
        </div>
        <Badge variant="default" className="text-xs bg-green-100 text-green-800 w-full justify-center">Completato</Badge>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg text-center text-xs text-muted-foreground">
        In attesa di dati
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Weapon Selection */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Arma</label>
        <Select 
          value={weapon} 
          onValueChange={(value) => {
            setWeapon(value);
            onUpdate(athleteA, athleteB, scoreA, scoreB, value);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fioretto">Fioretto</SelectItem>
            <SelectItem value="spada">Spada</SelectItem>
            <SelectItem value="sciabola">Sciabola</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{athleteAName}</label>
          <Input
            type="number"
            min="0"
            max="15"
            value={scoreA}
            onChange={(e) => {
              setScoreA(e.target.value);
              onUpdate(athleteA, athleteB, e.target.value, scoreB, weapon);
            }}
            className={`text-center ${
              isAWinning ? 'bg-green-100 border-green-300 text-green-800' : 
              isBWinning ? 'bg-red-100 border-red-300 text-red-800' : ''
            }`}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{athleteBName}</label>
          <Input
            type="number"
            min="0"
            max="15"
            value={scoreB}
            onChange={(e) => {
              setScoreB(e.target.value);
              onUpdate(athleteA, athleteB, scoreA, e.target.value, weapon);
            }}
            className={`text-center ${
              isBWinning ? 'bg-green-100 border-green-300 text-green-800' : 
              isAWinning ? 'bg-red-100 border-red-300 text-red-800' : ''
            }`}
            placeholder="0"
          />
        </div>
      </div>

      {isComplete && (
        <div className="flex items-center justify-center">
          <Badge variant="default" className="text-xs bg-green-100 text-green-800">Completato</Badge>
        </div>
      )}
    </div>
  );
};