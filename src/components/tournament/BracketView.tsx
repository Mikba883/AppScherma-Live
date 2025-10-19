import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, CheckCircle } from 'lucide-react';
import { useState } from 'react';
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
}

export const BracketView = ({ 
  matches, 
  athleteNames, 
  onRefresh,
  currentUserId,
  isInstructor,
  isCreator,
  tournamentId,
  gymId
}: BracketViewProps) => {
  // Raggruppa match per bracket_round
  const rounds = matches
    .filter(m => m.round_number !== null && m.round_number !== undefined)
    .reduce((acc, match) => {
      const round = match.round_number!;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {} as Record<number, TournamentMatch[]>);

  const sortedRounds = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundName = (roundNum: number, totalRounds: number) => {
    const roundsFromEnd = totalRounds - roundNum;
    if (roundsFromEnd === 0) return 'Finale';
    if (roundsFromEnd === 1) return 'Semifinali';
    if (roundsFromEnd === 2) return 'Quarti';
    if (roundsFromEnd === 3) return 'Ottavi';
    return `Turno ${roundNum}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-6 overflow-x-auto pb-4">
        {sortedRounds.map(roundNum => {
          const roundMatches = rounds[roundNum] || [];
          
          return (
            <div key={roundNum} className="flex flex-col gap-4 min-w-[320px]">
              <h3 className="font-bold text-center text-lg">
                {getRoundName(roundNum, sortedRounds.length)}
              </h3>
              
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
                />
              ))}
            </div>
          );
        })}
      </div>
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
  onRefresh
}: BracketMatchCardProps) => {
  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || '');
  const [weapon, setWeapon] = useState<string>(match.weapon || '');
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isInstructor || isCreator;
  const isAthleteA = currentUserId === match.athleteA;
  const isAthleteB = currentUserId === match.athleteB;
  const hasApprovedA = match.approved_by_a !== null;
  const hasApprovedB = match.approved_by_b !== null;
  const isCompleted = match.status === 'approved';

  const handleSave = async () => {
    if (!match.id || !tournamentId || !gymId) return;

    const parsedScoreA = parseInt(scoreA);
    const parsedScoreB = parseInt(scoreB);

    if (isNaN(parsedScoreA) || isNaN(parsedScoreB)) {
      toast.error('Inserisci punteggi validi');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('bouts')
        .update({
          score_a: parsedScoreA,
          score_b: parsedScoreB,
          weapon: weapon || null,
          status: (isInstructor || isCreator) ? 'approved' : 'pending',
          approved_by_a: (isInstructor || isCreator) ? currentUserId : null,
          approved_by_b: (isInstructor || isCreator) ? currentUserId : null,
        })
        .eq('id', match.id);

      if (error) throw error;

      toast.success('Match salvato');
      onRefresh();
    } catch (error) {
      console.error('Error saving match:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!match.id || !currentUserId) return;

    setIsSaving(true);

    try {
      const updateData: any = {};
      
      if (isAthleteA) {
        updateData.approved_by_a = currentUserId;
      } else if (isAthleteB) {
        updateData.approved_by_b = currentUserId;
      }

      // Check if both approvals are done
      const bothApproved = (isAthleteA && hasApprovedB) || (isAthleteB && hasApprovedA);
      if (bothApproved) {
        updateData.status = 'approved';
      }

      const { error } = await supabase
        .from('bouts')
        .update(updateData)
        .eq('id', match.id);

      if (error) throw error;

      toast.success('Match approvato');
      onRefresh();
    } catch (error) {
      console.error('Error approving match:', error);
      toast.error('Errore nell\'approvazione');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Match {matchNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {/* Weapon selector */}
        {canEdit && !isCompleted && (
          <Select value={weapon} onValueChange={setWeapon}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona arma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sciabola">Sciabola</SelectItem>
              <SelectItem value="Fioretto">Fioretto</SelectItem>
              <SelectItem value="Spada">Spada</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Action buttons */}
        {!isCompleted && (
          <div className="flex gap-2">
            {canEdit ? (
              <Button
                onClick={handleSave}
                disabled={isSaving || !scoreA || !scoreB}
                size="sm"
                className="w-full"
              >
                <Save className="w-3 h-3 mr-1" />
                Salva
              </Button>
            ) : (
              <>
                {((isAthleteA && !hasApprovedA) || (isAthleteB && !hasApprovedB)) && (
                  match.scoreA !== null && match.scoreB !== null && (
                    <Button
                      onClick={handleApprove}
                      disabled={isSaving}
                      size="sm"
                      className="w-full"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approva
                    </Button>
                  )
                )}
              </>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="text-xs text-center text-muted-foreground">
            ✓ Match completato
          </div>
        )}

        {match.weapon && (
          <div className="text-xs text-center text-muted-foreground">
            {match.weapon}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
