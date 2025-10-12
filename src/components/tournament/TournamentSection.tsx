import { useState, useEffect } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import { TournamentParticipantView } from './TournamentParticipantView';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trophy } from 'lucide-react';

interface TournamentSectionProps {
  onTournamentStateChange?: (hasUnsavedMatches: boolean) => void;
}

export const TournamentSection = ({ onTournamentStateChange }: TournamentSectionProps) => {
  const [mode, setMode] = useState<'menu' | 'create' | 'participate'>('menu');
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasActiveTournament, setHasActiveTournament] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkParticipation();
  }, []);

  useEffect(() => {
    // Notify parent about unsaved changes
    onTournamentStateChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onTournamentStateChange]);

  const checkParticipation = async () => {
    try {
      const { data } = await supabase.rpc('get_my_tournament_matches');
      if (data && data.length > 0) {
        setHasActiveTournament(true);
        setMode('participate');
      }
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };

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
    setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(true);
  };

  const handleExitTournament = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      exitTournament();
    }
  };

  const exitTournament = () => {
    setMode('menu');
    setTournamentStarted(false);
    setSelectedAthletes([]);
    setMatches([]);
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
  };

  const handleSaveTournament = async (tournamentName: string, tournamentDate: string, weapon: string, boutType: string) => {
    setSaving(true);
    
    try {
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

      setHasUnsavedChanges(false);
      exitTournament();
      
      // Check if now we're participating in a tournament
      await checkParticipation();

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
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      setTournamentStarted(false);
      setSelectedAthletes([]);
      setMatches([]);
    }
  };

  return (
    <div className="space-y-6">
      {mode === 'menu' && (
        <div className="space-y-4">
          {hasActiveTournament && (
            <Button 
              onClick={() => setMode('participate')}
              className="w-full"
              variant="default"
            >
              <Trophy className="mr-2 w-4 h-4" />
              Vedi Tornei in Corso
            </Button>
          )}
          <Button 
            onClick={() => setMode('create')}
            className="w-full"
            variant={hasActiveTournament ? "outline" : "default"}
          >
            <Plus className="mr-2 w-4 h-4" />
            Crea Nuovo Torneo
          </Button>
        </div>
      )}

      {mode === 'create' && (
        <div>
          {tournamentStarted && (
            <Button 
              variant="ghost" 
              onClick={handleExitTournament}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Esci dal Torneo
            </Button>
          )}
          
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
      )}

      {mode === 'participate' && (
        <TournamentParticipantView 
          onExit={() => {
            setMode('menu');
            setHasActiveTournament(false);
          }} 
        />
      )}

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attenzione: Modifiche non salvate</AlertDialogTitle>
            <AlertDialogDescription>
              Hai inserito dei dati che non sono stati salvati. Se esci ora, questi dati andranno persi.
              Vuoi uscire senza salvare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogAction 
              onClick={() => setShowExitDialog(false)}
              className="w-full sm:w-auto"
            >
              Rimani qui
            </AlertDialogAction>
            <AlertDialogCancel 
              onClick={exitTournament}
              className="w-full sm:w-auto"
            >
              Esci senza Salvare
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};