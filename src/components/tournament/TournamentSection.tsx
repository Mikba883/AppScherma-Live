import { useState } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';

export const TournamentSection = () => {
  console.log('TournamentSection - Component loaded');
  
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);

  const handleStartTournament = (athletes: TournamentAthlete[]) => {
    setSelectedAthletes(athletes);
    
    // Generate all possible matches (round robin)
    const newMatches: TournamentMatch[] = [];
    for (let i = 0; i < athletes.length; i++) {
      for (let j = i + 1; j < athletes.length; j++) {
        newMatches.push({
          athleteA: athletes[i].id,
          athleteB: athletes[j].id,
          scoreA: null,
          scoreB: null,
          weapon: null,
        });
      }
    }
    
    setMatches(newMatches);
    setTournamentStarted(true);
  };

  const handleUpdateMatch = (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => {
    setMatches(prev => 
      prev.map(match => {
        // Update both directions automatically
        if ((match.athleteA === athleteA && match.athleteB === athleteB)) {
          return { ...match, scoreA, scoreB, weapon };
        }
        if ((match.athleteA === athleteB && match.athleteB === athleteA)) {
          return { ...match, scoreA: scoreB, scoreB: scoreA, weapon };
        }
        return match;
      })
    );
  };

  const handleResetTournament = () => {
    setTournamentStarted(false);
    setSelectedAthletes([]);
    setMatches([]);
  };

  return (
    <div className="space-y-6">
      {!tournamentStarted ? (
        <TournamentSetup onStartTournament={handleStartTournament} />
      ) : (
        <TournamentMatrix 
          athletes={selectedAthletes}
          matches={matches}
          onUpdateMatch={handleUpdateMatch}
          onResetTournament={handleResetTournament}
        />
      )}
    </div>
  );
};