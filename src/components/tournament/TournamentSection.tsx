import { useState, useEffect } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trophy, RefreshCw } from 'lucide-react';
import { useUserRoleOptimized } from '@/hooks/useUserRoleOptimized';

interface TournamentSectionProps {
  onTournamentStateChange?: (hasUnsavedMatches: boolean) => void;
}

export const TournamentSection = ({ onTournamentStateChange }: TournamentSectionProps) => {
  const [mode, setMode] = useState<'menu' | 'setup' | 'matrix'>('menu');
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingTournaments, setCheckingTournaments] = useState(false);
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

  const checkActiveTournament = async (showToast = false) => {
    setCheckingTournaments(true);
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
        if (showToast) {
          toast({
            title: 'Torneo Trovato',
            description: `Sei stato aggiunto al torneo "${activeTournament.tournament_name}"`,
          });
        }
      } else if (showToast) {
        toast({
          title: 'Nessun Torneo Attivo',
          description: 'Non sei coinvolto in nessun torneo in corso',
        });
      }
    } catch (error) {
      console.error('Error checking tournament:', error);
    } finally {
      setCheckingTournaments(false);
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
          event: 'UPDATE',
          schema: 'public',
          table: 'bouts',
          filter: `tournament_id=eq.${tournamentId}`
        },
        async (payload) => {
          // Reload immediato senza debounce
          await loadTournamentData(tournamentId);
          
          // Toast solo se l'aggiornamento non è stato fatto da me
          const updatedBout = payload.new as any;
          if (updatedBout.created_by !== currentUserId) {
            toast({
              title: "Risultato aggiornato",
              description: "Un altro partecipante ha inserito un risultato",
              duration: 2000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        async (payload) => {
          const updatedTournament = payload.new as any;
          if (updatedTournament.status === 'completed' || updatedTournament.status === 'cancelled') {
            toast({
              title: "Torneo Chiuso",
              description: "Il torneo è stato chiuso dall'organizzatore",
            });
            await exitTournament();
          }
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
      console.error('[TournamentSection] User not authenticated');
      toast({
        title: "Errore",
        description: "Utente non autenticato",
        variant: "destructive",
      });
      return;
    }

    // Ottieni gym_id dal profilo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('user_id', user.id)
      .single();

    console.log('[TournamentSection] Profile data:', profile, 'Error:', profileError);

    if (!profile?.gym_id) {
      console.error('[TournamentSection] Profile not found or gym_id missing');
      toast({
        title: "Errore",
        description: "Profilo non trovato o gym_id mancante",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[TournamentSection] Creating tournament with gym_id:', profile.gym_id);
      
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

      console.log('[TournamentSection] Tournament created:', tournament, 'Error:', tournamentError);

      if (tournamentError) {
        console.error('[TournamentSection] Tournament creation error:', tournamentError);
        toast({
          title: "Errore Creazione Torneo",
          description: tournamentError.message || "Impossibile creare il torneo",
          variant: "destructive",
        });
        throw tournamentError;
      }

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

      console.log('[TournamentSection] Inserting bouts:', boutsToInsert.length);

      // 3. Inserisci tutti i bouts nel database
      const { error: boutsError } = await supabase
        .from('bouts')
        .insert(boutsToInsert);

      if (boutsError) {
        console.error('[TournamentSection] Bouts insertion error:', boutsError);
        toast({
          title: "Errore Inserimento Match",
          description: boutsError.message || "Impossibile creare i match del torneo",
          variant: "destructive",
        });
        throw boutsError;
      }

      console.log('[TournamentSection] Bouts inserted successfully');

      // Fix 4: Aspetta 500ms per sincronizzazione database
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Imposta lo stato locale
      setActiveTournamentId(tournament.id);
      setTournamentCreatorId(user.id);
      setMatches(allMatches);
      setTournamentStarted(true);
      setHasUnsavedChanges(false);
      setMode('matrix');
      
      console.log('[TournamentSection] State updated, switching to matrix mode');
      
      // 5. Sottoscrivi agli updates real-time
      subscribeToTournamentUpdates(tournament.id);
      
      onTournamentStateChange?.(false);
      
      toast({
        title: "Torneo Creato",
        description: "Gli altri atleti possono ora vedere e inserire i risultati.",
      });
    } catch (error: any) {
      console.error('[TournamentSection] Error creating tournament:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare il torneo",
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
    // Mostra sempre il dialog di conferma per scegliere tipo di uscita
    setShowExitConfirmDialog(true);
  };

  const exitTournament = async () => {
    // Reset local state
    setMode('menu');
    setTournamentStarted(false);
    setSelectedAthletes([]);
    setMatches([]);
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
    setShowExitConfirmDialog(false);
    setActiveTournamentId(null);
    setTournamentCreatorId(null);
  };

  const exitPermanently = async () => {
    if (!activeTournamentId || !currentUserId) return;
    
    try {
      // Marca come 'cancelled' tutti i bouts dell'utente in questo torneo
      const { error } = await supabase
        .from('bouts')
        .update({ status: 'cancelled' })
        .eq('tournament_id', activeTournamentId)
        .or(`athlete_a.eq.${currentUserId},athlete_b.eq.${currentUserId}`);

      if (error) throw error;
      
      // Reset local state
      await exitTournament();
      
      toast({
        title: "Uscita dal torneo",
        description: "Sei uscito definitivamente dal torneo",
      });
    } catch (error) {
      console.error('Error exiting tournament:', error);
      toast({
        title: "Errore",
        description: "Impossibile uscire dal torneo",
        variant: "destructive",
      });
    }
  };


  const handleSaveTournament = async (tournamentName: string, tournamentDate: string, weapon: string, boutType: string) => {
    if (!activeTournamentId) {
      toast({
        title: 'Errore',
        description: 'Nessun torneo attivo da salvare',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    
    try {
      // 1. Mark ALL completed bouts as 'approved'
      const { error: updateError } = await supabase
        .from('bouts')
        .update({ 
          status: 'approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString()
        })
        .eq('tournament_id', activeTournamentId)
        .not('score_a', 'is', null)
        .not('score_b', 'is', null);
      
      if (updateError) throw updateError;
      
      // 2. Mark tournament as completed
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', activeTournamentId);
      
      if (tournamentError) throw tournamentError;
      
      toast({
        title: 'Torneo Salvato!',
        description: 'Il torneo è stato completato con successo',
      });
      
      // 3. Reset local state
      setActiveTournamentId(null);
      setTournamentCreatorId(null);
      setHasUnsavedChanges(false);
      exitTournament();

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
            onClick={() => checkActiveTournament(true)}
            variant="outline"
            disabled={checkingTournaments}
            className="w-full"
          >
            {checkingTournaments ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Ricerca in corso...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Controlla Tornei Attivi
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => setMode('setup')}
            className="w-full"
            variant="default"
          >
            <Plus className="mr-2 w-4 h-4" />
            Crea Nuovo Torneo
          </Button>
        </div>
      )}

      {mode === 'setup' && (
        <TournamentSetup onStartTournament={handleStartTournament} />
      )}

      {mode === 'matrix' && tournamentStarted && (
        <div>
          <Button 
            variant="ghost" 
            onClick={handleExitTournament}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Esci dal Torneo
          </Button>
          
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
        </div>
      )}

      {/* Exit confirmation dialog - unsaved changes */}
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

      {/* Exit confirmation dialog - exit type */}
      <AlertDialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Come vuoi uscire dal torneo?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium">Scegli un'opzione:</p>
              <div className="space-y-2">
                <p><strong>Esci Temporaneamente:</strong> Potrai rientrare nel torneo in seguito</p>
                <p><strong>Esci Definitivamente:</strong> Ti rimuovi dal torneo e non lo vedrai più</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={exitTournament}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Esci Temporaneamente
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={exitPermanently}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Esci Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};