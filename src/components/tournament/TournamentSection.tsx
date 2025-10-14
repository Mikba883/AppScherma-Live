import { useState, useEffect } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trophy } from 'lucide-react';
import { useUserRoleOptimized } from '@/hooks/useUserRoleOptimized';

interface TournamentSectionProps {
  onTournamentStateChange?: (hasUnsavedMatches: boolean) => void;
}

export const TournamentSection = ({ onTournamentStateChange }: TournamentSectionProps) => {
  const [mode, setMode] = useState<'menu' | 'matrix'>('menu');
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [tournamentCreatorId, setTournamentCreatorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { isInstructor } = useUserRoleOptimized();

  useEffect(() => {
    loadCurrentUser();
    checkActiveTournament();
  }, []);

  useEffect(() => {
    onTournamentStateChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onTournamentStateChange]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const checkActiveTournament = async () => {
    try {
      // Usa la funzione database per ottenere il torneo attivo dove sono coinvolto
      const { data: activeTournament } = await supabase
        .rpc('get_my_active_tournament')
        .maybeSingle();

      if (activeTournament) {
        setActiveTournamentId(activeTournament.tournament_id);
        setTournamentCreatorId(activeTournament.created_by);
        await loadTournamentData(activeTournament.tournament_id);
        setMode('matrix');
      }
    } catch (error) {
      console.error('Error checking tournament:', error);
    }
  };

  const loadTournamentData = async (tournamentId: string) => {
    try {
      // Get all bouts for this tournament
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select('athlete_a, athlete_b, score_a, score_b, weapon')
        .eq('tournament_id', tournamentId);

      if (boutsError) throw boutsError;

      // Get unique athletes
      const athleteIds = new Set<string>();
      bouts?.forEach(bout => {
        athleteIds.add(bout.athlete_a);
        athleteIds.add(bout.athlete_b);
      });

      // Get athlete profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(athleteIds));

      if (profilesError) throw profilesError;

      const athletes: TournamentAthlete[] = profiles?.map(p => ({
        id: p.user_id,
        full_name: p.full_name
      })) || [];

      const matches: TournamentMatch[] = bouts?.map(b => ({
        athleteA: b.athlete_a,
        athleteB: b.athlete_b,
        scoreA: b.score_a,
        scoreB: b.score_b,
        weapon: b.weapon
      })) || [];

      setSelectedAthletes(athletes);
      setMatches(matches);
      setTournamentStarted(true);
      
      // Subscribe to real-time updates
      subscribeToTournamentUpdates(tournamentId);
    } catch (error) {
      console.error('Error loading tournament:', error);
    }
  };

  const subscribeToTournamentUpdates = (tournamentId: string) => {
    const channel = supabase
      .channel('tournament-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bouts',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Tournament update:', payload);
          // Reload tournament data on any change
          loadTournamentData(tournamentId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleStartTournament = async (athletes: TournamentAthlete[]) => {
    console.log('[TournamentSection] Starting tournament with athletes:', athletes);
    setSelectedAthletes(athletes);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Errore",
        description: "Utente non autenticato",
        variant: "destructive",
      });
      return;
    }

    // Ottieni gym_id dal profilo
    const { data: profile } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.gym_id) {
      toast({
        title: "Errore",
        description: "Profilo non trovato",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Crea il torneo nel database
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: `Torneo ${new Date().toLocaleDateString('it-IT')}`,
          tournament_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
          status: 'in_progress',
          bout_type: 'sparring',
          gym_id: profile.gym_id
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // 2. Genera tutti i match
      const allMatches: TournamentMatch[] = [];
      const boutsToInsert = [];
      
      for (let i = 0; i < athletes.length; i++) {
        for (let j = 0; j < athletes.length; j++) {
          if (i !== j) {
            allMatches.push({
              athleteA: athletes[i].id,
              athleteB: athletes[j].id,
              scoreA: null,
              scoreB: null,
              weapon: null,
            });
            
            boutsToInsert.push({
              tournament_id: tournament.id,
              athlete_a: athletes[i].id,
              athlete_b: athletes[j].id,
              bout_date: new Date().toISOString().split('T')[0],
              bout_type: 'sparring',
              status: 'pending',
              created_by: user.id,
              gym_id: profile.gym_id,
              score_a: null,
              score_b: null
            });
          }
        }
      }

      // 3. Inserisci tutti i bouts nel database
      const { error: boutsError } = await supabase
        .from('bouts')
        .insert(boutsToInsert);

      if (boutsError) throw boutsError;

      // 4. Imposta lo stato locale
      setActiveTournamentId(tournament.id);
      setTournamentCreatorId(user.id);
      setMatches(allMatches);
      setTournamentStarted(true);
      setHasUnsavedChanges(false);
      setMode('matrix');
      
      // 5. Sottoscrivi agli updates real-time
      subscribeToTournamentUpdates(tournament.id);
      
      onTournamentStateChange?.(false);
      
      toast({
        title: "Torneo Creato",
        description: "Gli altri atleti possono ora vedere e inserire i risultati.",
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il torneo",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMatch = async (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => {
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
    
    // If tournament is already created (has ID), update in real-time
    if (activeTournamentId) {
      try {
        const { error } = await supabase
          .from('bouts')
          .update({
            score_a: scoreA,
            score_b: scoreB,
            weapon: weapon
          })
          .eq('tournament_id', activeTournamentId)
          .eq('athlete_a', athleteA)
          .eq('athlete_b', athleteB);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating match:', error);
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  const handleExitTournament = async () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      await exitTournament();
    }
  };

  const exitTournament = async () => {
    // Reset local state only - tournament remains in_progress in DB
    // It will reappear until creator explicitly closes it or it's auto-closed after 24h
    setMode('menu');
    setTournamentStarted(false);
    setSelectedAthletes([]);
    setMatches([]);
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
    setActiveTournamentId(null);
    setTournamentCreatorId(null);
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

      if (isInstructor) {
        // CASO ISTRUTTORE: Salva direttamente ogni match come approved
        console.log('[TournamentSection] Instructor mode - saving matches directly');
        
        let savedCount = 0;
        for (const match of completedMatches) {
          const { error } = await supabase.rpc('register_bout_instructor', {
            _athlete_a: match.athleteA,
            _athlete_b: match.athleteB,
            _bout_date: tournamentDate,
            _weapon: weapon || null,
            _bout_type: boutType,
            _score_a: match.scoreA!,
            _score_b: match.scoreB!
          });

          if (error) {
            console.error('[TournamentSection] Error saving match:', error);
            throw error;
          }
          savedCount++;
        }

        // Update tournament status to completed
        if (activeTournamentId) {
          const { error: updateError } = await supabase
            .from('tournaments')
            .update({ status: 'completed' })
            .eq('id', activeTournamentId);
          
          if (updateError) {
            console.error('Failed to close tournament:', updateError);
            throw new Error('Impossibile chiudere il torneo');
          }
        }

        toast({
          title: 'Torneo Salvato!',
          description: `${savedCount} match salvati e registrati nel database`,
        });
        
        // Exit and reset tournament
        setActiveTournamentId(null);
        setTournamentCreatorId(null);
        exitTournament();
      } else {
        // CASO ALLIEVO: Usa il sistema di approvazione con notifiche
        console.log('[TournamentSection] Student mode - creating tournament with approval flow');
        
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

        // Set the tournament ID and update status to completed
        if (data) {
          setActiveTournamentId(data);
          const { error: updateError } = await supabase
            .from('tournaments')
            .update({ status: 'completed' })
            .eq('id', data);
          
          if (updateError) {
            console.error('Failed to close tournament:', updateError);
            throw new Error('Impossibile chiudere il torneo');
          }
        }

        toast({
          title: 'Torneo Salvato!',
          description: 'Il torneo è stato creato. Gli atleti riceveranno una notifica per approvare i loro match.',
        });
        
        // Exit and reset tournament
        setActiveTournamentId(null);
        setTournamentCreatorId(null);
        exitTournament();
      }

      setHasUnsavedChanges(false);

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
      {mode === 'menu' && !activeTournamentId && (
        <div className="space-y-4">
          <Button 
            onClick={() => setMode('matrix')}
            className="w-full"
            variant="default"
          >
            <Plus className="mr-2 w-4 h-4" />
            Crea Nuovo Torneo
          </Button>
        </div>
      )}

      {mode === 'matrix' && (
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
              currentUserId={currentUserId}
              tournamentCreatorId={tournamentCreatorId}
              activeTournamentId={activeTournamentId}
              organizerRole={isInstructor ? 'instructor' : 'student'}
            />
          )}
        </div>
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