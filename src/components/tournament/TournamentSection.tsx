import { useState, useEffect } from 'react';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trophy, RefreshCw } from 'lucide-react';
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
      setMatches([...matches]); // Forza re-render
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
          console.log('[Real-time] Bout aggiornato:', payload);
          // Reload immediato senza debounce
          await loadTournamentData(tournamentId);
          console.log('[Real-time] Dati ricaricati');
          
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
          event: 'INSERT',
          schema: 'public',
          table: 'bouts',
          filter: `tournament_id=eq.${tournamentId}`
        },
        async (payload) => {
          await loadTournamentData(tournamentId);
          
          const insertedBout = payload.new as any;
          if (insertedBout.created_by !== currentUserId) {
            toast({
              title: "Nuovo match aggiunto",
              description: "Un altro partecipante ha aggiunto un nuovo incontro",
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
          table: 'rankings',
        },
        async (payload) => {
          console.log('[Real-time] Ranking aggiornato:', payload);
          const updatedRanking = payload.new as any;
          
          // Verifica se l'atleta aggiornato è nel torneo attivo
          const isInTournament = selectedAthletes.some(
            a => a.id === updatedRanking.athlete_id
          );
          
          if (isInTournament) {
            await loadTournamentData(tournamentId);
            console.log('[Real-time] Classifica ricaricata');
            
            if (updatedRanking.athlete_id !== currentUserId) {
              toast({
                title: "Classifica aggiornata",
                description: "La classifica del torneo è stata aggiornata",
                duration: 1500,
              });
            }
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
            // Reset state
            setActiveTournamentId(null);
            setTournamentCreatorId(null);
            setSelectedAthletes([]);
            setMatches([]);
            setTournamentStarted(false);
            setMode('menu');
            setHasUnsavedChanges(false);
            onTournamentStateChange?.(false);
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
    // Normalizza ordine per ricerca coerente
    const [normalizedA, normalizedB] = [athleteA, athleteB].sort();
    
    setMatches(prev => 
      prev.map(match => {
        const [matchA, matchB] = [match.athleteA, match.athleteB].sort();
        if (matchA === normalizedA && matchB === normalizedB) {
          // Mantieni l'ordine originale del match, ma aggiorna i punteggi correttamente
          if (match.athleteA === athleteA) {
            return { ...match, scoreA, scoreB, weapon };
          } else {
            return { ...match, scoreA: scoreB, scoreB: scoreA, weapon };
          }
        }
        return match;
      })
    );
    
    // If tournament is already created (has ID), update in real-time
    if (activeTournamentId) {
      try {
        // Cerca il match nel database con ordine normalizzato
        const { data: existingBout } = await supabase
          .from('bouts')
          .select('athlete_a, athlete_b')
          .eq('tournament_id', activeTournamentId)
          .or(`and(athlete_a.eq.${athleteA},athlete_b.eq.${athleteB}),and(athlete_a.eq.${athleteB},athlete_b.eq.${athleteA})`)
          .maybeSingle();

        if (existingBout) {
          // Determina l'ordine corretto dei punteggi basandoti sull'ordine nel DB
          const finalScoreA = existingBout.athlete_a === athleteA ? scoreA : scoreB;
          const finalScoreB = existingBout.athlete_a === athleteA ? scoreB : scoreA;

          const { error } = await supabase
            .from('bouts')
            .update({
              score_a: finalScoreA,
              score_b: finalScoreB,
              weapon: weapon
            })
            .eq('tournament_id', activeTournamentId)
            .eq('athlete_a', existingBout.athlete_a)
            .eq('athlete_b', existingBout.athlete_b);

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error updating match:', error);
      }
    } else {
      setHasUnsavedChanges(true);
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
      setMode('menu');
      setTournamentStarted(false);
      setSelectedAthletes([]);
      setMatches([]);
      onTournamentStateChange?.(false);

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
          <div className="flex gap-2 mb-4">
            <Button 
              variant="outline"
              onClick={() => activeTournamentId && loadTournamentData(activeTournamentId)}
              disabled={!activeTournamentId}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aggiorna Risultati
            </Button>
          </div>
          
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

    </div>
  );
};