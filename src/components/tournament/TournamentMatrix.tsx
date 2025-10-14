import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trophy, Save, RotateCcw, Target, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TournamentMatrixProps {
  athletes: TournamentAthlete[];
  matches: TournamentMatch[];
  version?: number;
  onUpdateMatch: (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => void;
  onResetTournament: () => void;
  onSaveResults?: (tournamentName: string, tournamentDate: string, weapon: string, boutType: string) => Promise<void>;
  saving?: boolean;
  isStudentMode?: boolean;
  currentUserId?: string | null;
  tournamentCreatorId?: string | null;
  activeTournamentId?: string | null;
  organizerRole?: 'instructor' | 'student';
  isInstructor?: boolean;
}

export const TournamentMatrix = ({ 
  athletes, 
  matches,
  version,
  onUpdateMatch, 
  onResetTournament,
  onSaveResults,
  saving: externalSaving,
  isStudentMode = false,
  currentUserId = null,
  tournamentCreatorId = null,
  activeTournamentId = null,
  organizerRole = 'student',
  isInstructor = false
}: TournamentMatrixProps) => {
  const [saving, setSaving] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const navigate = useNavigate();
  
  // Fix 3: Check atleti vuoti
  if (!athletes || athletes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nessun atleta nel torneo</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const isSaving = externalSaving || saving;
  const isCreator = currentUserId && tournamentCreatorId && currentUserId === tournamentCreatorId;
  
  const canEditMatch = (athleteA: string, athleteB: string, matchData?: TournamentMatch): boolean => {
    if (!currentUserId) return false;
    // Se il match è completato, nessuno può modificarlo (serve annullare prima)
    const isComplete = matchData?.scoreA !== null && matchData?.scoreB !== null && matchData?.weapon;
    if (isComplete) return false;
    // Gli organizzatori (creator o istruttori) possono modificare tutto
    if (isCreator || organizerRole === 'instructor') return true;
    // I partecipanti possono modificare solo i propri match
    return athleteA === currentUserId || athleteB === currentUserId;
  };

  // Funzione separata per annullare match completati
  const canCancelMatch = (athleteA: string, athleteB: string, matchData?: TournamentMatch): boolean => {
    if (!currentUserId) return false;
    // Puoi annullare SOLO se il match è completato
    const isComplete = matchData?.scoreA !== null && matchData?.scoreB !== null && matchData?.weapon;
    if (!isComplete) return false;
    // Solo creator e istruttori possono annullare
    return isCreator || organizerRole === 'instructor';
  };

  const getMatch = useCallback((athleteA: string, athleteB: string): TournamentMatch | undefined => {
    // Normalizza ordine atleti per ricerca coerente
    const [normalizedA, normalizedB] = [athleteA, athleteB].sort();
    
    const match = matches.find(match => {
      const [matchA, matchB] = [match.athleteA, match.athleteB].sort();
      return matchA === normalizedA && matchB === normalizedB;
    });
    
    // Debug logging
    if (!match) {
      console.log('⚠️ Match NON trovato:', {
        cercato: `${athleteA} vs ${athleteB}`,
        normalizzato: `${normalizedA} vs ${normalizedB}`,
        disponibili: matches.map(m => {
          const [a, b] = [m.athleteA, m.athleteB].sort();
          return `${a} vs ${b}`;
        })
      });
    }
    
    return match;
  }, [matches, version]);

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

  // ❌ Rimossa: handleScoreChange - non più necessaria, MatchInputs salva direttamente nel DB

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
          console.log(`Turno ${round + 1}, Match ${i + 1}:`, {
            athleteA: athlete1.full_name,
            athleteB: athlete2.full_name
          });
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

  const rounds = useMemo(() => {
    const allRounds = generateRounds();
    
    // ✅ Se sei organizzatore (istruttore) → vedi tutto
    if (isInstructor) {
      return allRounds;
    }
    
    // ✅ Se sei atleta → vedi SOLO i tuoi match
    return allRounds.map(round => ({
      ...round,
      matches: round.matches.filter(match => 
        match.athleteA.id === currentUserId || match.athleteB.id === currentUserId
      )
    })).filter(round => round.matches.length > 0); // Rimuovi round vuoti
    
  }, [athletes, matches, isInstructor, currentUserId]);


  // Debug: log matches ogni volta che cambiano
  useEffect(() => {
    console.log('=== MATCHES AGGIORNATI ===');
    console.log('Numero totale matches:', matches.length);
    matches.forEach((m, idx) => {
      console.log(`Match ${idx + 1}:`, {
        athleteA: athletes.find(a => a.id === m.athleteA)?.full_name || m.athleteA,
        athleteB: athletes.find(a => a.id === m.athleteB)?.full_name || m.athleteB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        weapon: m.weapon
      });
    });
    console.log('===================');
  }, [matches, athletes]);

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

  const handleCancelTournament = async () => {
    if (!activeTournamentId) return;
    
    try {
      // 1. Mark tournament as cancelled
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'cancelled' })
        .eq('id', activeTournamentId);
      
      if (tournamentError) throw tournamentError;
      
      // 2. Delete ALL bouts from this tournament
      const { error: boutsError } = await supabase
        .from('bouts')
        .delete()
        .eq('tournament_id', activeTournamentId);
      
      if (boutsError) throw boutsError;
      
      toast.success('Torneo chiuso senza salvare');
      
      // 3. Exit tournament
      setShowFinishDialog(false);
      onResetTournament();
    } catch (error) {
      console.error('Error cancelling tournament:', error);
      toast.error('Impossibile chiudere il torneo');
    }
  };

  const handleSaveResults = async () => {
    if (!activeTournamentId) {
      toast.error('Nessun torneo attivo da salvare');
      return;
    }

    setSaving(true);
    
    try {
      // 1. Mark ALL completed bouts as 'approved'
      const { error: updateError } = await supabase
        .from('bouts')
        .update({ 
          status: 'approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString()
        })
        .eq('tournament_id', activeTournamentId)
        .not('score_a', 'is', null)
        .not('score_b', 'is', null);
      
      if (updateError) throw updateError;
      
      // 2. Mark tournament as completed
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', activeTournamentId);
      
      if (tournamentError) throw tournamentError;
      
      toast.success('Torneo salvato con successo!');
      
      // 3. Exit tournament
      setShowFinishDialog(false);
      onResetTournament();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast.error('Impossibile salvare il torneo');
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
                disabled={!isCreator}
                className="flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                FINE {!isCreator && <span className="text-xs ml-1">(Solo Creatore)</span>}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tournament Matrix - READ-ONLY */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Matrice Torneo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="table-fixed">
                  <TableHeader>
                     <TableRow>
                       <TableHead className="w-48 min-w-48 max-w-48">Atleta</TableHead>
                       {athletes.map((athlete) => (
                         <TableHead key={athlete.id} className="text-center w-32 min-w-32 max-w-32 text-xs px-1">
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <div className="truncate cursor-help whitespace-nowrap">
                                   {athlete.full_name}
                                 </div>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <p>{athlete.full_name}</p>
                               </TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
                         </TableHead>
                       ))}
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {athletes.map((athleteA) => (
                       <TableRow key={athleteA.id}>
                         <TableCell className="font-medium text-sm w-48 min-w-48 max-w-48 px-2 sticky left-0 bg-background">
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <div className="truncate cursor-help whitespace-nowrap">
                                   {athleteA.full_name}
                                 </div>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <p>{athleteA.full_name}</p>
                               </TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
                         </TableCell>
                          {athletes.map((athleteB) => {
                            const match = getMatch(athleteA.id, athleteB.id);
                            
                            return (
                              <TableCell 
                                key={`${athleteB.id}-${version}`}
                                className="p-1 w-32 min-w-32 max-w-32"
                              >
                             {athleteA.id === athleteB.id ? (
                               <div className="w-20 h-16 bg-muted rounded flex items-center justify-center">
                                 <Target className="w-4 h-4 text-muted-foreground" />
                               </div>
                             ) : (
                                <ReadOnlyMatchCell 
                                  athleteA={athleteA.id}
                                  athleteB={athleteB.id}
                                  match={match} 
                                />
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
                       <div key={`${match.athleteA.id}-${match.athleteB.id}-${version}`} className={`p-4 rounded border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                         <div className="text-sm font-medium mb-3">
                           {match.athleteA.full_name} vs {match.athleteB.full_name}
                         </div>
                           <MatchInputs
                             key={matchData?.id || `${match.athleteA.id}-${match.athleteB.id}`}
                             athleteA={match.athleteA.id}
                             athleteB={match.athleteB.id}
                             athleteAName={match.athleteA.full_name}
                             athleteBName={match.athleteB.full_name}
                             match={matchData}
                             canEdit={canEditMatch(match.athleteA.id, match.athleteB.id, matchData)}
                             canCancel={canCancelMatch(match.athleteA.id, match.athleteB.id, matchData)}
                             currentUserId={currentUserId}
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
              Sono stati completati {getCompletedMatches()} incontri su {getTotalMatches()}.
              <br /><br />
              <strong>Scegli come vuoi chiudere il torneo:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li><strong>Salva i Dati:</strong> I match completati verranno registrati nel database.</li>
                <li><strong>Non Salvare:</strong> Il torneo verrà chiuso senza registrare nessun match.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowFinishDialog(false)}>
              Annulla
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleCancelTournament}
            >
              FINE senza Salvare
            </Button>
            <Button
              onClick={handleSaveResults}
              disabled={getCompletedMatches() === 0 || isSaving}
            >
              {isSaving ? 'Salvataggio...' : 'FINE e Salva i Dati'}
            </Button>
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
  canEdit?: boolean;
  canCancel?: boolean;
  currentUserId?: string | null;
}

const MatchInputs = ({ athleteA, athleteB, athleteAName, athleteBName, match, canEdit = true, canCancel = false, currentUserId }: MatchInputsProps) => {
  // ✅ Stato locale per form controllato
  const [localScoreA, setLocalScoreA] = useState(match?.scoreA?.toString() || '');
  const [localScoreB, setLocalScoreB] = useState(match?.scoreB?.toString() || '');
  const [localWeapon, setLocalWeapon] = useState(match?.weapon || 'fioretto');
  const [isSaving, setIsSaving] = useState(false);
  
  const isComplete = match?.scoreA !== null && match?.scoreB !== null && match?.weapon;
  const isAWinning = isComplete && match.scoreA! > match.scoreB!;
  const isBWinning = isComplete && match.scoreB! > match.scoreA!;

  // ✅ Match completato → visualizzazione read-only
  if (isComplete) {
    return (
      <div className="space-y-2 p-3 bg-muted/50 rounded-lg relative">
        <div className="text-xs text-muted-foreground">Arma: {match.weapon}</div>
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <div className="font-medium">{athleteAName}</div>
            <div className={`text-2xl ${isAWinning ? 'text-green-600 font-bold' : 'text-red-600'}`}>
              {match.scoreA}
            </div>
          </div>
          <div className="text-muted-foreground">-</div>
          <div className="text-sm text-right">
            <div className="font-medium">{athleteBName}</div>
            <div className={`text-2xl ${isBWinning ? 'text-green-600 font-bold' : 'text-red-600'}`}>
              {match.scoreB}
            </div>
          </div>
        </div>
        {canCancel ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full bg-green-100 hover:bg-red-100 text-green-800 hover:text-red-800 transition-colors"
            onClick={async () => {
              if (!match?.id) return;
              
              try {
                console.log('[Annulla] 🗑️ Annullamento match:', match.id);
                
                const { error } = await supabase
                  .from('bouts')
                  .update({
                    score_a: null,
                    score_b: null,
                    weapon: null,
                    status: 'pending'
                  })
                  .eq('id', match.id);

                if (error) throw error;
                
                console.log('[Annulla] ✅ Match annullato - real-time aggiornerà tutti');
                toast('Match annullato', { duration: 2000 });
              } catch (error) {
                console.error('Errore nell\'annullamento del match:', error);
                toast.error('Errore nell\'annullamento del match');
              }
            }}
          >
            <Check className="h-3 w-3 mr-1" />
            Completato
            <RotateCcw className="h-3 w-3 ml-1 opacity-50" />
          </Button>
        ) : (
          <Badge variant="default" className="text-xs bg-green-100 text-green-800 w-full justify-center">
            Completato
          </Badge>
        )}
      </div>
    );
  }

  // ✅ Match non completato + può modificare → form con salvataggio esplicito
  if (canEdit) {
    const handleSave = async () => {
      if (!match?.id) return;
      
      if (!localScoreA || !localScoreB || !localWeapon) {
        toast.error('Compila tutti i campi');
        return;
      }
      
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('bouts')
          .update({
            score_a: parseInt(localScoreA),
            score_b: parseInt(localScoreB),
            weapon: localWeapon,
            status: 'pending'
          })
          .eq('id', match.id);
        
        if (error) throw error;
        toast.success('Match salvato!');
      } catch (error) {
        console.error(error);
        toast.error('Errore nel salvataggio');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Arma</label>
          <Select 
            value={localWeapon} 
            onValueChange={setLocalWeapon}
            disabled={isSaving}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{athleteAName}</label>
            <Input
              type="number"
              min="0"
              max="15"
              value={localScoreA}
              onChange={(e) => setLocalScoreA(e.target.value)}
              disabled={isSaving}
              className="text-center"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{athleteBName}</label>
            <Input
              type="number"
              min="0"
              max="15"
              value={localScoreB}
              onChange={(e) => setLocalScoreB(e.target.value)}
              disabled={isSaving}
              className="text-center"
              placeholder="0"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
          size="sm"
        >
          {isSaving ? 'Salvataggio...' : 'Salva Match'}
        </Button>
      </div>
    );
  }

  // ✅ Match non completato + NON può modificare → messaggi di attesa
  const isInvolved = currentUserId && (athleteA === currentUserId || athleteB === currentUserId);
  
  if (isInvolved) {
    return (
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center space-y-2">
        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          Il tuo avversario deve ancora inserire i dati
        </div>
        <Badge variant="outline" className="text-xs border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
          In attesa dell'avversario
        </Badge>
      </div>
    );
  }
  
  return (
    <div className="p-3 bg-muted/30 rounded-lg text-center text-xs text-muted-foreground">
      In attesa di dati
    </div>
  );
};