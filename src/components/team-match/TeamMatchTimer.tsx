import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BOUT_TIME_LIMIT, OVERTIME_TIME_LIMIT } from '@/types/team-match';

interface TeamMatchTimerProps {
  isOvertime?: boolean;
  onTimeUp: () => void;
  onTimeUpdate: (elapsed: number) => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
  externalReset?: number; // Increment to trigger external reset
}

export const TeamMatchTimer = ({
  isOvertime = false,
  onTimeUp,
  onTimeUpdate,
  isPaused: externalPaused,
  onPauseChange,
  externalReset = 0,
}: TeamMatchTimerProps) => {
  const timeLimit = isOvertime ? OVERTIME_TIME_LIMIT : BOUT_TIME_LIMIT;
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  const remaining = Math.max(0, timeLimit - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = (elapsed / timeLimit) * 100;

  // Sync with external pause state
  useEffect(() => {
    if (externalPaused !== undefined) {
      setIsPaused(externalPaused);
    }
  }, [externalPaused]);

  // Reset on external trigger
  useEffect(() => {
    if (externalReset > 0) {
      setElapsed(0);
      setIsPaused(true);
    }
  }, [externalReset]);

  // Timer logic
  useEffect(() => {
    if (isPaused || remaining <= 0) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const newElapsed = prev + 1;
        onTimeUpdate(newElapsed);
        if (newElapsed >= timeLimit) {
          onTimeUp();
          return timeLimit;
        }
        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, remaining, timeLimit, onTimeUp, onTimeUpdate]);

  const togglePause = useCallback(() => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    onPauseChange?.(newPaused);
  }, [isPaused, onPauseChange]);

  const handleReset = useCallback(() => {
    setElapsed(0);
    setIsPaused(true);
    onTimeUpdate(0);
    onPauseChange?.(true);
  }, [onTimeUpdate, onPauseChange]);

  // Color based on remaining time
  const getColorClass = () => {
    if (remaining <= 30) return 'text-destructive';
    if (remaining <= 60) return 'text-yellow-500';
    return 'text-foreground';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Timer Display */}
      <div
        className={cn(
          'text-5xl md:text-6xl font-mono font-bold tabular-nums transition-colors',
          getColorClass()
        )}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000',
            remaining <= 30 ? 'bg-destructive' : remaining <= 60 ? 'bg-yellow-500' : 'bg-primary'
          )}
          style={{ width: `${100 - progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant={isPaused ? 'default' : 'secondary'}
          size="lg"
          onClick={togglePause}
          disabled={remaining <= 0}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 mr-2" />
              Avvia
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pausa
            </>
          )}
        </Button>
        <Button variant="outline" size="lg" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Time limit label */}
      <p className="text-xs text-muted-foreground">
        {isOvertime ? 'Minuto Supplementare' : 'Limite: 3 minuti per assalto'}
      </p>
    </div>
  );
};
