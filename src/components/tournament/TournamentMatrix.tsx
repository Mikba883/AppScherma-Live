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
    onUpdateMatch(athleteA, athleteB, numScoreA, numScoreB, weapon || null);
  };

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
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Torneo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Conferma Reset</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler resettare il torneo? Tutti i risultati inseriti saranno persi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={onResetTournament}>
                        Reset Torneo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={getCompletedMatches() === 0 || saving}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvataggio...' : 'Salva Risultati'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Salva Risultati Torneo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Confermi di voler salvare {getCompletedMatches()} incontri completati? 
                        I risultati saranno registrati nel database e i ranking aggiornati.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveResults}>
                        Salva Risultati
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
                          {athlete.full_name.split(' ').map(n => n[0]).join('')}
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
  const [weapon, setWeapon] = useState(match?.weapon || '');

  const handleUpdate = () => {
    onUpdate(athleteA, athleteB, scoreA, scoreB, weapon);
  };

  const isComplete = match?.scoreA !== null && match?.scoreB !== null && match?.weapon;

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
          className="h-6 text-xs text-center p-1"
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
          className="h-6 text-xs text-center p-1"
          placeholder="0"
        />
      </div>

      {isComplete && (
        <div className="h-1 bg-green-500 rounded w-full"></div>
      )}
    </div>
  );
};