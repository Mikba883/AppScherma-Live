import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TournamentMatch } from '@/types/tournament';

interface BracketViewProps {
  matches: TournamentMatch[];
  athleteNames: Map<string, string>;
  onRefresh: () => void;
}

export const BracketView = ({ matches, athleteNames, onRefresh }: BracketViewProps) => {
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
                <Card key={match.id || idx} className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Match {idx + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {athleteNames.get(match.athleteA) || 'TBD'}
                      </span>
                      <Badge variant={
                        match.scoreA !== null && match.scoreB !== null
                          ? (match.scoreA > match.scoreB ? 'default' : 'secondary')
                          : 'outline'
                      }>
                        {match.scoreA ?? '-'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {athleteNames.get(match.athleteB) || 'TBD'}
                      </span>
                      <Badge variant={
                        match.scoreA !== null && match.scoreB !== null
                          ? (match.scoreB > match.scoreA ? 'default' : 'secondary')
                          : 'outline'
                      }>
                        {match.scoreB ?? '-'}
                      </Badge>
                    </div>

                    {match.status === 'approved' && (
                      <div className="text-xs text-center text-muted-foreground mt-2">
                        ✓ Match completato
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
