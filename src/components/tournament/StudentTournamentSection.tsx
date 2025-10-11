import React, { useState } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const StudentTournamentSection = () => {
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleStartTournament = (athletes: TournamentAthlete[]) => {
    setSelectedAthletes(athletes);
    
    const newMatches: TournamentMatch[] = [];
    for (let i = 0; i < athletes.length; i++) {
      for (let j = 0; j < athletes.length; j++) {
        if (i !== j) {
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
        if (match.athleteA === athleteA && match.athleteB === athleteB) {
          return { ...match, scoreA, scoreB, weapon };
        }
        if (match.athleteA === athleteB && match.athleteB === athleteA) {
          return { ...match, scoreA: scoreB, scoreB: scoreA, weapon };
        }
        return match;
      })
    );
  };

  const handleSaveTournament = async (tournamentName: string, tournamentDate: string, weapon: string, boutType: string) => {
    setSaving(true);
    
    try {
      // Get only completed matches (with scores)
      const completedMatches = matches.filter(m => 
        m.scoreA !== null && m.scoreB !== null && m.weapon !== null
      );

      if (completedMatches.length === 0) {
        toast({
          title: 'Errore',
          description: 'Completa almeno un match prima di salvare il torneo',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Prepare matches for database (only unique pairs)
      const uniqueMatches: any[] = [];
      const seenPairs = new Set<string>();

      completedMatches.forEach(match => {
        const pairKey = [match.athleteA, match.athleteB].sort().join('-');
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          uniqueMatches.push({
            athlete_a: match.athleteA,
            athlete_b: match.athleteB,
            score_a: match.scoreA,
            score_b: match.scoreB,
          });
        }
      });

      // Call the database function
      const { data, error } = await supabase.rpc('register_tournament_matches', {
        _tournament_name: tournamentName,
        _tournament_date: tournamentDate,
        _weapon: weapon || '',
        _bout_type: boutType,
        _matches: uniqueMatches,
      });

      if (error) throw error;

      toast({
        title: 'Torneo Salvato!',
        description: 'Il torneo è stato creato. Gli atleti riceveranno una notifica per approvare i loro match.',
      });

      // Reset state
      setTournamentStarted(false);
      setSelectedAthletes([]);
      setMatches([]);
      
      // Navigate to "I Miei Tornei" tab after a short delay
      setTimeout(() => {
        navigate('/?tab=my-tournaments');
      }, 1500);

    } catch (error: any) {
      console.error('Error saving tournament:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare il torneo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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
          onSaveResults={handleSaveTournament}
          saving={saving}
          isStudentMode={true}
        />
      )}
    </div>
  );
};
