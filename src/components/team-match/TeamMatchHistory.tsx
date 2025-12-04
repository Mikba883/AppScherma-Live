import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Swords } from 'lucide-react';
import { TeamMatchBout, TEAM_RELAY_SEQUENCE } from '@/types/team-match';
import { cn } from '@/lib/utils';

interface TeamMatchHistoryProps {
  bouts: TeamMatchBout[];
  currentBout: number;
  teamAAthletes: { id: string; name: string }[];
  teamBAthletes: { id: string; name: string }[];
}

export const TeamMatchHistory = ({
  bouts,
  currentBout,
  teamAAthletes,
  teamBAthletes,
}: TeamMatchHistoryProps) => {
  const getAthleteName = (team: 'A' | 'B', index: number) => {
    const athletes = team === 'A' ? teamAAthletes : teamBAthletes;
    const athlete = athletes[index - 1];
    return athlete?.name || `${team}${index}`;
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cronologia Assalti
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-2">
            {TEAM_RELAY_SEQUENCE.map((sequence) => {
              const bout = bouts.find((b) => b.bout_number === sequence.bout);
              const isCompleted = bout?.status === 'completed';
              const isInProgress = bout?.status === 'in_progress';
              const isCurrent = sequence.bout === currentBout;
              const isPending = !isCompleted && !isInProgress;

              return (
                <div
                  key={sequence.bout}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    isCompleted && 'bg-muted/50 border-muted',
                    isInProgress && 'bg-primary/10 border-primary',
                    isCurrent && !isInProgress && 'border-primary/50',
                    isPending && !isCurrent && 'opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : isInProgress ? (
                        <Swords className="w-4 h-4 text-primary animate-pulse" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="font-medium">Assalto {sequence.bout}</span>
                    </div>
                    <Badge variant={isCompleted ? 'secondary' : isInProgress ? 'default' : 'outline'}>
                      Target: {sequence.target}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {getAthleteName('A', sequence.teamAIndex)}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {getAthleteName('B', sequence.teamBIndex)}
                      </span>
                    </div>

                    {isCompleted && bout && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          ⏱️ {formatTime(bout.time_elapsed)}
                        </span>
                        <span className="font-mono font-bold">
                          <span className="text-blue-600 dark:text-blue-400">
                            {bout.end_score_a}
                          </span>
                          {' - '}
                          <span className="text-red-600 dark:text-red-400">
                            {bout.end_score_b}
                          </span>
                        </span>
                      </div>
                    )}

                    {isInProgress && bout && (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        In corso... (+{bout.bout_touches_a}/{bout.bout_touches_b})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
