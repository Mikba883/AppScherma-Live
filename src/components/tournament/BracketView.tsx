import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { TournamentMatch } from '@/types/tournament';

interface BracketViewProps {
  matches: TournamentMatch[];
  athleteNames: Map<string, string>;
  onRefresh: () => void;
  currentUserId: string | null;
  isInstructor: boolean;
  isCreator: boolean;
  tournamentId: string | null;
  gymId: string | null;
  onRoundComplete?: (completedRound: number) => Promise<void>;
  totalBracketRounds: number;
}

export const BracketView = ({ 
  matches, 
  athleteNames, 
  onRefresh,
  currentUserId,
  isInstructor,
  isCreator,
  tournamentId,
  gymId,
  onRoundComplete,
  totalBracketRounds
}: BracketViewProps) => {
  const [isCompletingRound, setIsCompletingRound] = useState(false);
  const [localScores, setLocalScores] = useState<Map<string, { scoreA: number | null, scoreB: number | null }>>(new Map());

  const handleScoresChange = (matchId: string, scoreA: number | null, scoreB: number | null) => {
    setLocalScores(prev => {
      const newMap = new Map(prev);
      newMap.set(matchId, { scoreA, scoreB });
      return newMap;
    });
  };

  const handleCompleteRound = async (roundNum: number) => {
    if (!tournamentId || !gymId) return;

    const roundMatches = rounds[roundNum] || [];
    
    // Check if all matches have scores
    const allMatchesHaveScores = roundMatches.every(m => 
      m.scoreA !== null && m.scoreB !== null
    );

    if (!allMatchesHaveScores) {
      toast.error('Tutti i match del turno devono avere un punteggio prima di completare il turno');
      return;
    }

    setIsCompletingRound(true);

    try {
      // Approve all matches in this round in batch
      const matchIds = roundMatches.map(m => m.id).filter(Boolean);
      
      const { error } = await supabase
        .from('bouts')
        .update({
          status: 'approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          approved_by_a: currentUserId,
          approved_by_b: currentUserId,
        })
        .in('id', matchIds);

      if (error) throw error;

      toast.success(`Turno ${roundNum} completato!`);

      // Refresh and advance to next round
      onRefresh();
      
      if (onRoundComplete) {
        await onRoundComplete(roundNum);
      }
    } catch (error) {
      console.error('Error completing round:', error);
      toast.error('Errore nel completamento del turno');
    } finally {
      setIsCompletingRound(false);
    }
  };

  // Raggruppa match per bracket_round E ordina per bracket_match_number
  const rounds = matches
    .filter(m => m.bracket_round !== null && m.bracket_round !== undefined)
    .sort((a, b) => {
      // Prima ordina per bracket_round
      if (a.bracket_round !== b.bracket_round) {
        return a.bracket_round! - b.bracket_round!;
      }
      // Poi per bracket_match_number (se presente)
      if (a.bracket_match_number && b.bracket_match_number) {
        return a.bracket_match_number - b.bracket_match_number;
      }
      // Altrimenti per id (fallback per consistenza)
      return 0;
    })
    .reduce((acc, match) => {
      const round = match.bracket_round!;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {} as Record<number, TournamentMatch[]>);

  const sortedRounds = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b); // From first round to final

  const getRoundName = (roundNum: number, numMatches: number) => {
    // ✅ FIX 3: Calcola il nome basandosi sulla distanza dalla finale
    const effectiveTotalRounds = totalBracketRounds > 0 
      ? totalBracketRounds 
      : (sortedRounds.length > 0 ? Math.max(...sortedRounds) : 1);
    
    // Distanza dalla finale (finale = 0, semifinale = 1, quarti = 2, ...)
    const distanceFromFinal = effectiveTotalRounds - roundNum;
    
    console.log('[BracketView] 🏆 getRoundName:', {
      roundNum,
      numMatches,
      totalBracketRounds,
      effectiveTotalRounds,
      distanceFromFinal
    });
    
    // Usa la distanza invece del numero di match (più accurato con BYE)
    if (distanceFromFinal === 0) return '🏆 Finale';
    if (distanceFromFinal === 1) return 'Semifinali';
    if (distanceFromFinal === 2) return 'Quarti di Finale';
    if (distanceFromFinal === 3) return 'Ottavi di Finale';
    if (distanceFromFinal === 4) return 'Sedicesimi di Finale';
    
    // Fallback per round intermedi
    return `Turno ${roundNum}`;
  };

  const canEdit = isInstructor || isCreator;

  return (
    <div className="space-y-8">
      {sortedRounds.map(roundNum => {
        const roundMatches = rounds[roundNum] || [];
        // Check local scores first, fallback to database values
        const allMatchesHaveScores = roundMatches.every(m => {
          // Skip BYE matches - they don't need scores
          const athleteAName = athleteNames.get(m.athleteA);
          const athleteBName = athleteNames.get(m.athleteB);
          const isByeMatch = !m.athleteA || !m.athleteB || 
                             !athleteAName || !athleteBName ||
                             athleteAName === 'TBD' || athleteBName === 'TBD';
          
          if (isByeMatch) {
            return true; // BYE matches are always considered "complete"
          }
          
          // For real matches, check local scores first, fallback to database
          const localScore = localScores.get(m.id);
          if (localScore) {
            return localScore.scoreA !== null && localScore.scoreB !== null;
          }
          return m.scoreA !== null && m.scoreB !== null;
        });
        const allMatchesApproved = roundMatches.every(m => 
          m.status === 'approved'
        );
        
        return (
          <div key={roundNum} className="space-y-4">
            <h3 className="font-bold text-center text-xl bg-primary text-primary-foreground py-2 rounded">
              {getRoundName(roundNum, roundMatches.length)}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roundMatches.map((match, idx) => (
                <BracketMatchCard
                  key={match.id || idx}
                  match={match}
                  matchNumber={idx + 1}
                  athleteNames={athleteNames}
                  currentUserId={currentUserId}
                  isInstructor={isInstructor}
                  isCreator={isCreator}
                  tournamentId={tournamentId}
                  gymId={gymId}
                  onRefresh={onRefresh}
                  onScoresChange={handleScoresChange}
                />
              ))}
            </div>

            {/* Complete Round Button */}
            {canEdit && !allMatchesApproved && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => handleCompleteRound(roundNum)}
                  disabled={!allMatchesHaveScores || isCompletingRound}
                  size="lg"
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {allMatchesHaveScores 
                    ? `Completa Turno ${roundNum}` 
                    : `Inserisci tutti i punteggi per completare il turno`}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Sub-component for bracket match card with input
interface BracketMatchCardProps {
  match: TournamentMatch;
  matchNumber: number;
  athleteNames: Map<string, string>;
  currentUserId: string | null;
  isInstructor: boolean;
  isCreator: boolean;
  tournamentId: string | null;
  gymId: string | null;
  onRefresh: () => void;
  onScoresChange: (matchId: string, scoreA: number | null, scoreB: number | null) => void;
}

const BracketMatchCard = ({
  match,
  matchNumber,
  athleteNames,
  currentUserId,
  isInstructor,
  isCreator,
  tournamentId,
  gymId,
  onRefresh,
  onScoresChange
}: BracketMatchCardProps) => {
  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || '');

  // Notify parent immediately when scores change locally
  useEffect(() => {
    const parsedScoreA = scoreA === '' ? null : parseInt(scoreA);
    const parsedScoreB = scoreB === '' ? null : parseInt(scoreB);
    
    // Notify parent of current local state (even if incomplete)
    if (match.id) {
      onScoresChange(
        match.id, 
        isNaN(parsedScoreA as number) ? null : parsedScoreA,
        isNaN(parsedScoreB as number) ? null : parsedScoreB
      );
    }
  }, [scoreA, scoreB, match.id, onScoresChange]);

  // Auto-save scores when they change
  useEffect(() => {
    const saveScores = async () => {
      if (!match.id || !tournamentId || !gymId) return;
      
      const parsedScoreA = parseInt(scoreA);
      const parsedScoreB = parseInt(scoreB);

      // Only save if both scores are valid numbers
      if (isNaN(parsedScoreA) || isNaN(parsedScoreB)) return;
      
      // Only save if scores actually changed from database values
      if (parsedScoreA === match.scoreA && parsedScoreB === match.scoreB) return;

      try {
        const { error } = await supabase
          .from('bouts')
          .update({
            score_a: parsedScoreA,
            score_b: parsedScoreB,
          })
          .eq('id', match.id);

        if (error) throw error;

        // Refresh parent - but don't include onRefresh in dependencies to avoid loops
        onRefresh();
      } catch (error) {
        console.error('Error auto-saving scores:', error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveScores, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreA, scoreB, match.id, match.scoreA, match.scoreB, tournamentId, gymId]);

  const canEdit = isInstructor || isCreator;
  const isAthleteA = currentUserId === match.athleteA;
  const isAthleteB = currentUserId === match.athleteB;
  const hasApprovedA = match.approved_by_a !== null;
  const hasApprovedB = match.approved_by_b !== null;
  const isCompleted = match.status === 'approved';



  // Check if it's a BYE match (one athlete is TBD)
  const isByeMatch = !match.athleteA || !match.athleteB || 
                     !athleteNames.get(match.athleteA) || 
                     !athleteNames.get(match.athleteB);

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Match {matchNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isByeMatch && (
          <Badge variant="secondary" className="w-full text-center">
            TBD - In attesa del turno precedente
          </Badge>
        )}
        
        {/* Athletes and scores */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">
              {athleteNames.get(match.athleteA) || 'TBD'}
              {hasApprovedA && <CheckCircle className="inline w-3 h-3 ml-1 text-green-600" />}
            </span>
            {canEdit && !isCompleted ? (
              <Input
                type="number"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                className="w-16 text-center"
                placeholder="0"
              />
            ) : (
              <Badge variant={
                match.scoreA !== null && match.scoreB !== null
                  ? (match.scoreA > match.scoreB ? 'default' : 'secondary')
                  : 'outline'
              }>
                {match.scoreA ?? '-'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">
              {athleteNames.get(match.athleteB) || 'TBD'}
              {hasApprovedB && <CheckCircle className="inline w-3 h-3 ml-1 text-green-600" />}
            </span>
            {canEdit && !isCompleted ? (
              <Input
                type="number"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                className="w-16 text-center"
                placeholder="0"
              />
            ) : (
              <Badge variant={
                match.scoreA !== null && match.scoreB !== null
                  ? (match.scoreB > match.scoreA ? 'default' : 'secondary')
                  : 'outline'
              }>
                {match.scoreB ?? '-'}
              </Badge>
            )}
          </div>
        </div>

        {/* Weapon badge */}
        {match.weapon && (
          <Badge variant="outline" className="w-full justify-center">
            Arma: {match.weapon.charAt(0).toUpperCase() + match.weapon.slice(1)}
          </Badge>
        )}

        {isCompleted && (
          <Badge variant="default" className="w-full justify-center">
            ✓ Match completato
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
