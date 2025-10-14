import { useState, useEffect, useRef } from 'react';
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
  const [matchVersion, setMatchVersion] = useState(0);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingTournaments, setCheckingTournaments] = useState(false);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [tournamentCreatorId, setTournamentCreatorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { isInstructor } = useUserRoleOptimized();
  const isSubscribed = useRef(false);

  useEffect(() => {
    loadCurrentUser();
    checkActiveTournament();
  }, []);

  useEffect(() => {
    onTournamentStateChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onTournamentStateChange]);

  // Controllo periodico dello status del torneo (fallback se realtime non funziona)
  useEffect(() => {
    if (!activeTournamentId) return;

    const interval = setInterval(async () => {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('status')
        .eq('id', activeTournamentId)
        .single();

      if (tournament && (tournament.status === 'completed' || tournament.status === 'cancelled')) {
        console.log('[Polling] Torneo chiuso rilevato:', tournament.status);
        toast({
          title: "Torneo Chiuso",
          description: "Il torneo è stato chiuso dall'organizzatore",
        });
        handleExitTournament();
      }
    }, 5000); // Controlla ogni 5 secondi

    return () => clearInterval(interval);
  }, [activeTournamentId]);

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
        .select('id, athlete_a, athlete_b, score_a, score_b, weapon, status')
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
        id: b.id,
        athleteA: b.athlete_a,
        athleteB: b.athlete_b,
        scoreA: b.score_a === null ? null : b.score_a,  // ✅ Esplicito
        scoreB: b.score_b === null ? null : b.score_b,  // ✅ Esplicito
        weapon: b.weapon || null,  // ✅ Esplicito
        status: b.status
      })).filter(m => {
        // ✅ RIMUOVI match invalidi (stesso atleta)
        if (m.athleteA === m.athleteB) {
          console.warn('[loadTournamentData] ⚠️ Match invalido rimosso:', m);
          return false;
        }
        return true;
      }) || [];

      console.log('[loadTournamentData] Matches caricati:', matches.length);

      // Forza completamente un nuovo array
      setSelectedAthletes([...athletes]);
      setMatches([...matches]);
      setTournamentStarted(true);
      
      // Subscribe to real-time updates ONLY if not already subscribed
      if (!isSubscribed.current) {
        subscribeToTournamentUpdates(tournamentId);
        isSubscribed.current = true;
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    }
  };

  const handleExitTournament = () => {
    console.log('[Exit] Uscita dal torneo');
    setActiveTournamentId(null);
    setTournamentCreatorId(null);
    setSelectedAthletes([]);
    setMatches([]);
    setTournamentStarted(false);
    setMode('menu');
    setHasUnsavedChanges(false);
    onTournamentStateChange?.(false);
    isSubscribed.current = false;
  };

  const subscribeToTournamentUpdates = (tournamentId: string) => {
    console.log('[Subscription] Sottoscritto a torneo', tournamentId);
    console.log('[Subscription] Ascolto eventi su tabella tournaments con filter:', `id=eq.${tournamentId}`);
    
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
          console.log('[Real-time] 🔄 Bout UPDATE ricevuto:', payload);
          const updatedBout = payload.new as any;
          
          console.log('[Real-time] Dati aggiornati:', {
            id: updatedBout.id,
            score_a: updatedBout.score_a,
            score_b: updatedBout.score_b,
            status: updatedBout.status,
            weapon: updatedBout.weapon
          });
          
          // ✅ RICARICA TUTTO invece di update parziale
          if (activeTournamentId) {
            await loadTournamentData(activeTournamentId);
          }
          
          // ✅ Toast ANCHE per annullamenti
          if (updatedBout.created_by !== currentUserId) {
            const wasReset = updatedBout.score_a === null && updatedBout.score_b === null;
            toast({
              title: wasReset ? "Match annullato" : "Risultato aggiornato",
              description: wasReset 
                ? "Un altro partecipante ha annullato un match" 
                : "Un altro partecipante ha completato un match",
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
          
          if (isInTournament && updatedRanking.athlete_id !== currentUserId) {
            // ✅ SOLO NOTIFICA, NON ricaricare i dati!
            toast({
              title: "Classifica aggiornata",
              description: "La classifica del torneo è stata aggiornata",
              duration: 1500,
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
          console.log('[Real-time] Tournament aggiornato:', payload);
          const updatedTournament = payload.new as any;
          console.log('[Real-time] Nuovo status torneo:', updatedTournament.status);
          
          if (updatedTournament.status === 'completed' || updatedTournament.status === 'cancelled') {
            console.log('[Real-time] Torneo chiuso, uscita...');
            toast({
              title: "Torneo Chiuso",
              description: "Il torneo è stato chiuso dall'organizzatore",
            });
            handleExitTournament();
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
          // ✅ VALIDAZIONE RIGOROSA: Salta se stesso atleta
          if (i === j) continue;
          
          allMatches.push({
            athleteA: athletes[i].id,
            athleteB: athletes[j].id,
            scoreA: null,
            scoreB: null,
            weapon: null,
            status: 'pending'
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
      
      console.log('[TournamentSection] Match generati:', allMatches.length, 'per', athletes.length, 'atleti');

      console.log('[TournamentSection] Inserting bouts:', boutsToInsert.length);

      // 3. Inserisci tutti i bouts nel database e ottieni gli ID generati
      const { data: insertedBouts, error: boutsError } = await supabase
        .from('bouts')
        .insert(boutsToInsert)
        .select('id, athlete_a, athlete_b, score_a, score_b, weapon, status');

      if (boutsError) {
        console.error('[TournamentSection] Bouts insertion error:', boutsError);
        toast({
          title: "Errore Inserimento Match",
          description: boutsError.message || "Impossibile creare i match del torneo",
          variant: "destructive",
        });
        throw boutsError;
      }

      console.log('[TournamentSection] Bouts inserted successfully:', insertedBouts?.length);

      // ✅ Mappa i bouts inseriti con gli ID dal DB
      const matchesWithIds: TournamentMatch[] = (insertedBouts || []).map(b => ({
        id: b.id,  // ✅ ID generato dal DB
        athleteA: b.athlete_a,
        athleteB: b.athlete_b,
        scoreA: b.score_a,
        scoreB: b.score_b,
        weapon: b.weapon,
        status: b.status
      }));

      console.log('[TournamentSection] Matches with IDs:', matchesWithIds.length);

      // 4. Imposta lo stato locale
      setActiveTournamentId(tournament.id);
      setTournamentCreatorId(user.id);
      setMatches(matchesWithIds);  // ✅ Usa i match CON gli ID dal DB
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

  const handleUpdateMatch = async (
    athleteA: string, 
    athleteB: string, 
    scoreA: string | number, 
    scoreB: string | number, 
    weapon: string
  ) => {
    console.log('[handleUpdateMatch] START:', { athleteA, athleteB, scoreA, scoreB, weapon });
    
    // ✅ Trova il match nello stato locale per ottenere l'ID
    const localMatch = matches.find(m => {
      // ✅ VALIDAZIONE: Escludi match con stesso atleta
      if (m.athleteA === m.athleteB) {
        console.warn('[handleUpdateMatch] ⚠️ Match invalido ignorato:', m);
        return false;
      }
      
      return (m.athleteA === athleteA && m.athleteB === athleteB) ||
             (m.athleteA === athleteB && m.athleteB === athleteA);
    });
    
    console.log('[handleUpdateMatch] 🔍 Ricerca match:', {
      cercato: `${athleteA} vs ${athleteB}`,
      totaleMatches: matches.length,
      matchTrovato: localMatch ? 'SÌ' : 'NO',
      matchDisponibili: matches.slice(0, 5).map(m => ({
        id: m.id,
        athleteA: m.athleteA,
        athleteB: m.athleteB,
        status: m.status
      }))
    });
    
    console.log('[handleUpdateMatch] 🔎 localMatch trovato:', {
      esiste: !!localMatch,
      hasId: !!localMatch?.id,
      id: localMatch?.id,
      athleteA: localMatch?.athleteA,
      athleteB: localMatch?.athleteB
    });
    
    if (!localMatch?.id) {
      console.error('[handleUpdateMatch] Match ID non trovato nello stato locale');
      toast({
        title: "Errore",
        description: "Impossibile identificare il match",
        variant: "destructive",
      });
      return;
    }
    
    // Validazione
    const numScoreA = Number(scoreA);
    const numScoreB = Number(scoreB);
    
    if (isNaN(numScoreA) || isNaN(numScoreB) || !weapon) {
      console.log('[handleUpdateMatch] ❌ Match incompleto, ignoro salvataggio');
      return;
    }
    
    if (!activeTournamentId) {
      console.log('[handleUpdateMatch] ❌ Nessun torneo attivo');
      return;
    }
    
    try {
      // ✅ USA direttamente l'ID dal match locale
      const boutId = localMatch.id;
      
      // ✅ CONTROLLO: Se il match è già approvato con questi valori, non fare nulla
      if (localMatch.status === 'approved' &&
          localMatch.scoreA === numScoreA &&
          localMatch.scoreB === numScoreB &&
          localMatch.weapon === weapon) {
        console.log('[handleUpdateMatch] ⏭️ Match già salvato con questi valori, skip');
        return;
      }
      
      // Determina ordine atleti
      const isNormalOrder = localMatch.athleteA === athleteA;
      
      // Prepara UPDATE
      const updates = {
        score_a: isNormalOrder ? numScoreA : numScoreB,
        score_b: isNormalOrder ? numScoreB : numScoreA,
        weapon: weapon,
        status: 'approved'
      };
      
      console.log('[handleUpdateMatch] 💾 SAVING TO DB:', { bout_id: boutId, updates });
      
      // ✅ UPDATE diretto usando l'ID
      const { error: updateError } = await supabase
        .from('bouts')
        .update(updates)
        .eq('id', boutId);
      
      if (updateError) throw updateError;
      
      // ✅ Aggiorna stato locale usando l'ID
      setMatches(prev => prev.map(match => {
        if (match.id === boutId) {
          return {
            ...match,
            scoreA: isNormalOrder ? numScoreA : numScoreB,
            scoreB: isNormalOrder ? numScoreB : numScoreA,
            weapon: weapon,
            status: 'approved'
          };
        }
        return match;
      }));
      
      console.log('[handleUpdateMatch] ✅ Match salvato con successo');
      
      toast({
        title: "Match salvato",
        description: "Il risultato è stato registrato con successo",
      });
      
    } catch (error: any) {
      console.error('[handleUpdateMatch] ❌ Errore:', error);
      toast({
        title: "Errore salvataggio",
        description: error.message || "Impossibile salvare il match",
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
    isSubscribed.current = false;
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
            version={matchVersion}
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