import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Minus, Trophy, AlertTriangle, StopCircle } from 'lucide-react';
import { TeamMatchTimer } from './TeamMatchTimer';
import { TeamMatchHistory } from './TeamMatchHistory';
import { TeamMatch, TeamMatchBout, TEAM_RELAY_SEQUENCE, shouldEndBout, shouldEndMatch, FINAL_TARGET, MAX_BOUT_TOUCHES } from '@/types/team-match';
import { cn } from '@/lib/utils';

interface TeamMatchLiveProps {
  match: TeamMatch;
  bouts: TeamMatchBout[];
  teamAAthletes: { id: string; name: string }[];
  teamBAthletes: { id: string; name: string }[];
  onScoreUpdate: (team: 'A' | 'B', increment: number) => void;
  onBoutComplete: (timeElapsed: number) => void;
  onMatchComplete: (winner: 'A' | 'B') => void;
  onStartOvertime: () => void;
  onCancelMatch: () => void;
}

export const TeamMatchLive = ({
  match,
  bouts,
  teamAAthletes,
  teamBAthletes,
  onScoreUpdate,
  onBoutComplete,
  onMatchComplete,
  onStartOvertime,
  onCancelMatch,
}: TeamMatchLiveProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [timerResetKey, setTimerResetKey] = useState(0);
  const [showEndBoutDialog, setShowEndBoutDialog] = useState(false);
  const [showEndMatchDialog, setShowEndMatchDialog] = useState(false);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [endReason, setEndReason] = useState('');

  const currentBoutSequence = TEAM_RELAY_SEQUENCE[match.current_bout - 1];
  const currentBout = bouts.find((b) => b.bout_number === match.current_bout);

  const currentAthleteA = teamAAthletes[currentBoutSequence?.teamAIndex - 1];
  const currentAthleteB = teamBAthletes[currentBoutSequence?.teamBIndex - 1];

  // Check bout end conditions
  useEffect(() => {
    if (!currentBout || currentBout.status !== 'in_progress') return;

    const result = shouldEndBout(
      match.total_score_a,
      match.total_score_b,
      currentBoutSequence.target,
      currentBout.bout_touches_a,
      currentBout.bout_touches_b,
      timeElapsed
    );

    if (result.end && !showEndBoutDialog) {
      setIsPaused(true);
      setEndReason(result.reason);
      
      // Check if match should end
      const matchResult = shouldEndMatch(
        match.total_score_a,
        match.total_score_b,
        match.current_bout,
        true
      );

      if (matchResult.ended) {
        setShowEndMatchDialog(true);
      } else if (matchResult.overtime) {
        setShowOvertimeDialog(true);
      } else {
        setShowEndBoutDialog(true);
      }
    }
  }, [match, currentBout, currentBoutSequence, timeElapsed, showEndBoutDialog]);

  const handleTimeUp = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleScoreChange = (team: 'A' | 'B', increment: number) => {
    if (!currentBout || isPaused) return;
    
    // Prevent going below start score
    const currentScore = team === 'A' ? match.total_score_a : match.total_score_b;
    const startScore = team === 'A' ? currentBout.start_score_a : currentBout.start_score_b;
    if (increment < 0 && currentScore <= startScore) return;

    // Prevent exceeding max touches per bout
    const boutTouches = team === 'A' ? currentBout.bout_touches_a : currentBout.bout_touches_b;
    if (increment > 0 && boutTouches >= MAX_BOUT_TOUCHES) return;

    onScoreUpdate(team, increment);
  };

  const handleConfirmBoutEnd = () => {
    setShowEndBoutDialog(false);
    onBoutComplete(timeElapsed);
    setTimeElapsed(0);
    setTimerResetKey((k) => k + 1);
  };

  const handleConfirmMatchEnd = () => {
    setShowEndMatchDialog(false);
    const winner = match.total_score_a > match.total_score_b ? 'A' : 'B';
    onMatchComplete(winner);
  };

  const handleConfirmOvertime = () => {
    setShowOvertimeDialog(false);
    onStartOvertime();
  };

  if (!currentBoutSequence) {
    return <div>Errore: sequenza assalto non trovata</div>;
  }

  return (
    <div className="space-y-4">
      {/* Main Score Display */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-3">
            {/* Team A Score */}
            <div className="bg-blue-500/10 p-6 text-center">
              <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                {match.team_a_name}
              </h3>
              <div className="text-6xl md:text-8xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {match.total_score_a}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {currentAthleteA?.name || `A${currentBoutSequence.teamAIndex}`}
              </div>
            </div>

            {/* Center Info */}
            <div className="flex flex-col items-center justify-center p-4 bg-muted/30">
              <Badge variant="outline" className="mb-2">
                Assalto {match.current_bout}/9
              </Badge>
              <div className="text-xs text-muted-foreground mb-1">
                A{currentBoutSequence.teamAIndex} vs B{currentBoutSequence.teamBIndex}
              </div>
              <div className="text-lg font-bold text-primary">
                Target: {currentBoutSequence.target}
              </div>
              {currentBout && (
                <div className="text-xs text-muted-foreground mt-1">
                  Stoccate: {currentBout.bout_touches_a} / {currentBout.bout_touches_b}
                </div>
              )}
            </div>

            {/* Team B Score */}
            <div className="bg-red-500/10 p-6 text-center">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                {match.team_b_name}
              </h3>
              <div className="text-6xl md:text-8xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                {match.total_score_b}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {currentAthleteB?.name || `B${currentBoutSequence.teamBIndex}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timer */}
      <Card>
        <CardContent className="py-6">
          <TeamMatchTimer
            isOvertime={match.status === 'overtime'}
            onTimeUp={handleTimeUp}
            onTimeUpdate={setTimeElapsed}
            isPaused={isPaused}
            onPauseChange={setIsPaused}
            externalReset={timerResetKey}
          />
        </CardContent>
      </Card>

      {/* Score Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team A Controls */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h4 className="text-center text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
              Stoccata {match.team_a_name}
            </h4>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleScoreChange('A', -1)}
                disabled={isPaused || (currentBout && match.total_score_a <= currentBout.start_score_a)}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <Button
                variant="default"
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 px-8"
                onClick={() => handleScoreChange('A', 1)}
                disabled={isPaused || (currentBout && currentBout.bout_touches_a >= MAX_BOUT_TOUCHES)}
              >
                <Plus className="w-5 h-5 mr-1" />
                +1
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team B Controls */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <h4 className="text-center text-sm font-medium text-red-600 dark:text-red-400 mb-3">
              Stoccata {match.team_b_name}
            </h4>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleScoreChange('B', -1)}
                disabled={isPaused || (currentBout && match.total_score_b <= currentBout.start_score_b)}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <Button
                variant="default"
                size="lg"
                className="bg-red-500 hover:bg-red-600 px-8"
                onClick={() => handleScoreChange('B', 1)}
                disabled={isPaused || (currentBout && currentBout.bout_touches_b >= MAX_BOUT_TOUCHES)}
              >
                <Plus className="w-5 h-5 mr-1" />
                +1
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <TeamMatchHistory
        bouts={bouts}
        currentBout={match.current_bout}
        teamAAthletes={teamAAthletes}
        teamBAthletes={teamBAthletes}
      />

      {/* Cancel Button */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setShowCancelDialog(true)}
      >
        <StopCircle className="w-4 h-4 mr-2" />
        Annulla Incontro
      </Button>

      {/* End Bout Dialog */}
      <AlertDialog open={showEndBoutDialog} onOpenChange={setShowEndBoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fine Assalto {match.current_bout}</AlertDialogTitle>
            <AlertDialogDescription>
              {endReason}
              <br />
              Punteggio: {match.total_score_a} - {match.total_score_b}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConfirmBoutEnd}>
              {match.current_bout < 9 ? 'Prossimo Assalto' : 'Continua'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Match Dialog */}
      <AlertDialog open={showEndMatchDialog} onOpenChange={setShowEndMatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Fine Incontro!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Risultato finale: {match.total_score_a} - {match.total_score_b}
              <br />
              <span className="font-bold text-lg">
                Vince {match.total_score_a > match.total_score_b ? match.team_a_name : match.team_b_name}!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConfirmMatchEnd}>
              Salva Risultato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overtime Dialog */}
      <AlertDialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Parità! Minuto Supplementare
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il punteggio è {match.total_score_a} - {match.total_score_b}.
              <br />
              Si procede con il minuto supplementare. La prima stoccata vince!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConfirmOvertime}>
              Inizia Overtime
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Match Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare l'incontro?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler annullare questo incontro a squadre? Tutti i dati andranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Continua</AlertDialogCancel>
            <AlertDialogAction onClick={onCancelMatch} className="bg-destructive">
              Sì, Annulla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
