import React, { useState } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';

interface TournamentSectionProps {
  onTournamentStateChange?: (hasUnsavedMatches: boolean) => void;
}

export const TournamentSection = ({ onTournamentStateChange }: TournamentSectionProps) => {
  console.log('TournamentSection - Component loaded');
  
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);

  const handleStartTournament = (athletes: TournamentAthlete[]) => {
    setSelectedAthletes(athletes);
    
    // Generate all possible matches (both directions for complete matrix)
    const newMatches: TournamentMatch[] = [];
    for (let i = 0; i < athletes.length; i++) {
      for (let j = 0; j < athletes.length; j++) {
        if (i !== j) { // Don't create matches with same athlete
          newMatches.push({
            athleteA: athletes[i].id,
            athleteB: athletes[j].id,
            scoreA: null,
            scoreB: null,
            weapon: null,
          });
        }
      }
    }
    
    setMatches(newMatches);
    setTournamentStarted(true);
  };

  const handleUpdateMatch = (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => {
    setMatches(prev => 
      prev.map(match => {
        // Update the exact match
        if (match.athleteA === athleteA && match.athleteB === athleteB) {
          return { ...match, scoreA, scoreB, weapon };
        }
        // Update the reverse match with swapped scores
        if (match.athleteA === athleteB && match.athleteB === athleteA) {
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
    onTournamentStateChange?.(false);
  };

  // Check for unsaved matches and notify parent
  const hasUnsavedMatches = () => {
    return tournamentStarted && matches.some(match => 
      match.scoreA !== null && match.scoreB !== null && match.weapon !== null
    );
  };

  // Notify parent when tournament state changes
  React.useEffect(() => {
    onTournamentStateChange?.(hasUnsavedMatches());
  }, [matches, tournamentStarted, onTournamentStateChange]);

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