import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TournamentSetup } from './TournamentSetup';
import { TournamentMatrix } from './TournamentMatrix';
import { toast } from 'sonner';
import { Trophy, RefreshCw, Plus } from 'lucide-react';
import type { TournamentAthlete, TournamentMatch } from '@/types/tournament';

interface TournamentSectionProps {
  onTournamentStateChange?: (hasUnsavedMatches: boolean) => void;
}

export const TournamentSection = ({ onTournamentStateChange }: TournamentSectionProps) => {
  const [mode, setMode] = useState<'menu' | 'setup' | 'matrix'>('menu');
  const [athletes, setAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState<string>('');
  const [tournamentDate, setTournamentDate] = useState<string>('');
  const [tournamentWeapon, setTournamentWeapon] = useState<string | null>(null);
  const [tournamentBoutType, setTournamentBoutType] = useState<string>('sparring');
  const [tournamentCreatorId, setTournamentCreatorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userGymId, setUserGymId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosingTournament, setIsClosingTournament] = useState(false);
  const [tournamentPhase, setTournamentPhase] = useState<number>(1);
  const [totalBracketRounds, setTotalBracketRounds] = useState<number>(0);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Check for active tournament only when in menu mode and not closing
  useEffect(() => {
    if (currentUserId && userGymId && mode === 'menu' && !isClosingTournament) {
      checkActiveTournament();
    }
  }, [currentUserId, userGymId, mode, isClosingTournament]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserGymId(profile.gym_id);
      }
    } catch (error) {
      console.error('[TournamentSection] Error loading user:', error);
    }
  };

  const checkActiveTournament = async () => {
    try {
      console.log('[TournamentSection] Checking for active tournament...');
      console.log('[TournamentSection] Current user:', currentUserId);
      console.log('[TournamentSection] User gym:', userGymId);
      
      const { data, error } = await supabase.rpc('get_my_active_tournament');
      
      console.log('[TournamentSection] RPC response:', { data, error });
      
      if (error) {
        console.error('[TournamentSection] Error checking active tournament:', error);
        return;
      }

      if (data && data.length > 0) {
        const tournament = data[0];
        console.log('[TournamentSection] Found active tournament:', tournament);
        
        setActiveTournamentId(tournament.tournament_id);
        setTournamentName(tournament.tournament_name);
        setTournamentDate(tournament.tournament_date);
        setTournamentWeapon(tournament.weapon);
        setTournamentBoutType(tournament.bout_type);
        setTournamentCreatorId(tournament.created_by);
        setTournamentPhase(tournament.phase || 1);
        
        await loadTournamentData(tournament.tournament_id);
        setMode('matrix');
      } else {
        console.log('[TournamentSection] No active tournament found');
      }
    } catch (error) {
      console.error('[TournamentSection] Error in checkActiveTournament:', error);
    }
  };

  const loadTournamentData = async (tournamentId: string) => {
    console.log('[TournamentSection] Loading tournament data:', tournamentId);
    setIsLoading(true);
    
    try {
      // Load tournament info to get the phase and total_bracket_rounds
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('phase, total_bracket_rounds')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      
      const currentPhase = tournamentData?.phase || 1;
      
      // Update phase state
      console.log('[TournamentSection] Tournament phase:', currentPhase);
      setTournamentPhase(currentPhase);
      
      // Update total bracket rounds
      if (tournamentData?.total_bracket_rounds) {
        setTotalBracketRounds(tournamentData.total_bracket_rounds);
      }

      // Load bouts filtered by phase
      let boutsQuery = supabase
        .from('bouts')
        .select('*')
        .eq('tournament_id', tournamentId);
      
      // Filter by phase: Phase 1 = round_number matches, Phase 2 = bracket_round matches
      if (currentPhase === 1) {
        boutsQuery = boutsQuery.is('bracket_round', null);
      } else {
        boutsQuery = boutsQuery.not('bracket_round', 'is', null);
      }
      
      const { data: bouts, error: boutsError } = await boutsQuery
        .order('round_number', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (boutsError) throw boutsError;

      console.log('[TournamentSection] Loaded bouts:', bouts?.length, 'matches');
      console.log('[TournamentSection] Matches by round:', bouts?.reduce((acc: any, m: any) => {
        const round = m.bracket_round || m.round_number || 'unknown';
        acc[round] = (acc[round] || 0) + 1;
        return acc;
      }, {}));

      if (!bouts || bouts.length === 0) {
        console.log('[TournamentSection] No bouts found');
        setMatches([]);
        setAthletes([]);
        return;
      }

      // Get unique athlete IDs
      const athleteIds = [...new Set(bouts.flatMap(b => [b.athlete_a, b.athlete_b]))];
      
      // Load athlete profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', athleteIds);

      if (profilesError) throw profilesError;

      console.log('[TournamentSection] Loaded profiles:', profiles);

      // Map bouts to matches
      const mappedMatches: TournamentMatch[] = bouts.map(bout => ({
        id: bout.id,
        athleteA: bout.athlete_a,
        athleteB: bout.athlete_b,
        scoreA: bout.score_a,
        scoreB: bout.score_b,
        weapon: bout.weapon,
        status: bout.status,
        round_number: bout.round_number,
        bracket_round: bout.bracket_round,
        approved_by_a: bout.approved_by_a,
        approved_by_b: bout.approved_by_b
      }));

      // Map profiles to athletes
      const mappedAthletes: TournamentAthlete[] = profiles.map(p => ({
        id: p.user_id,
        full_name: p.full_name
      }));

      setMatches(mappedMatches);
      setAthletes(mappedAthletes);
      
      console.log('[TournamentSection] Data loaded - Matches:', mappedMatches.length, 'Athletes:', mappedAthletes.length);
    } catch (error) {
      console.error('[TournamentSection] Error loading tournament data:', error);
      toast.error('Errore nel caricamento dei dati del torneo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTournament = async (
    selectedAthletes: TournamentAthlete[],
    name: string,
    date: string,
    weapon: string | null,
    boutType: string
  ) => {
    if (!currentUserId) {
      toast.error('Utente non autenticato');
      return;
    }

    if (!userGymId) {
      toast.error('Devi essere associato a una palestra per creare un torneo');
      return;
    }

    console.log('[TournamentSection] Creating tournament:', {
      name,
      date,
      weapon,
      boutType,
      athletesCount: selectedAthletes.length
    });

    setIsLoading(true);

    try {
      // 1. Create tournament record
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name,
          tournament_date: date,
          created_by: currentUserId,
          status: 'in_progress',
          bout_type: boutType,
          weapon: weapon || null,
          gym_id: userGymId,
          phase: 1  // ✅ Force Phase 1 for new tournaments
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      console.log('[TournamentSection] Tournament created:', tournament);
      
      // ✅ Reset phase state
      setTournamentPhase(1);
      setTotalBracketRounds(0);

      // 2. Generate all matches with round-robin scheduling
      const boutsToInsert = [];
      let athletesList = [...selectedAthletes];
      
      // Add BYE if odd number of athletes
      if (athletesList.length % 2 === 1) {
        athletesList.push({ id: 'bye', full_name: 'BYE' });
      }

      const numAthletes = athletesList.length;
      const totalRounds = numAthletes - 1;

      for (let round = 0; round < totalRounds; round++) {
        for (let i = 0; i < numAthletes / 2; i++) {
          const athlete1 = athletesList[i];
          const athlete2 = athletesList[numAthletes - 1 - i];
          
          if (athlete1.id !== 'bye' && athlete2.id !== 'bye') {
            boutsToInsert.push({
              tournament_id: tournament.id,
              athlete_a: athlete1.id,
              athlete_b: athlete2.id,
              bout_date: date,
              bout_type: boutType,
              weapon: weapon || null,
              status: 'pending',
              created_by: currentUserId,
              gym_id: userGymId,
              score_a: null,
              score_b: null,
              round_number: round + 1
            });
          }
        }

        // Rotate athletes (keep first fixed)
        const temp = athletesList[1];
        for (let i = 1; i < numAthletes - 1; i++) {
          athletesList[i] = athletesList[i + 1];
        }
        athletesList[numAthletes - 1] = temp;
      }

      console.log('[TournamentSection] Inserting bouts:', boutsToInsert.length);

      // 3. Insert all bouts
      const { data: insertedBouts, error: boutsError } = await supabase
        .from('bouts')
        .insert(boutsToInsert)
        .select();

      if (boutsError) throw boutsError;

      console.log('[TournamentSection] Bouts inserted:', insertedBouts);

      // 4. Set state
      setActiveTournamentId(tournament.id);
      setTournamentName(name);
      setTournamentDate(date);
      setTournamentWeapon(weapon);
      setTournamentBoutType(boutType);
      setTournamentCreatorId(currentUserId);
      setAthletes(selectedAthletes);
      
      // Map inserted bouts to matches
      const mappedMatches: TournamentMatch[] = insertedBouts.map(bout => ({
        id: bout.id,
        athleteA: bout.athlete_a,
        athleteB: bout.athlete_b,
        scoreA: bout.score_a,
        scoreB: bout.score_b,
        weapon: bout.weapon,
        status: bout.status,
        round_number: bout.round_number,
        bracket_round: bout.bracket_round,
        approved_by_a: bout.approved_by_a,
        approved_by_b: bout.approved_by_b
      }));
      
      setMatches(mappedMatches);
      setMode('matrix');

      toast.success('Torneo creato con successo!');
    } catch (error) {
      console.error('[TournamentSection] Error creating tournament:', error);
      toast.error('Errore nella creazione del torneo');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate final rankings
  const calculateFinalRankings = (
    athletesList: TournamentAthlete[],
    matchesList: TournamentMatch[]
  ): { athleteId: string; position: number; wins: number; totalMatches: number; pointsDiff: number }[] => {
    // Calculate stats for each athlete
    const stats = athletesList.map(athlete => {
      let wins = 0;
      let totalMatches = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;

      matchesList.forEach(match => {
        if (match.scoreA === null || match.scoreB === null) return;

        if (match.athleteA === athlete.id) {
          totalMatches++;
          pointsFor += match.scoreA;
          pointsAgainst += match.scoreB;
          if (match.scoreA > match.scoreB) wins++;
        } else if (match.athleteB === athlete.id) {
          totalMatches++;
          pointsFor += match.scoreB;
          pointsAgainst += match.scoreA;
          if (match.scoreB > match.scoreA) wins++;
        }
      });

      return {
        athleteId: athlete.id,
        wins,
        totalMatches,
        pointsFor,
        pointsAgainst,
        pointsDiff: pointsFor - pointsAgainst
      };
    });

    // Sort like in TournamentMatrix
    stats.sort((a, b) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsDiff - a.pointsDiff;
    });

    // Assign positions
    return stats.map((stat, index) => ({
      ...stat,
      position: index + 1
    }));
  };

  const generatePhase2Bracket = async (
    rankings: { athleteId: string; position: number; wins: number; totalMatches: number; pointsDiff: number }[]
  ) => {
    const sortedAthletes = rankings.sort((a, b) => a.position - b.position);
    const n = sortedAthletes.length;
    
    // Calculate total rounds needed (e.g., 8 players = 3 rounds)
    const totalRounds = Math.ceil(Math.log2(n));
    
    console.log(`[Phase 2] Creating bracket for ${n} athletes with ${totalRounds} rounds`);
    
    // Save total rounds to tournament
    await supabase
      .from('tournaments')
      .update({ total_bracket_rounds: totalRounds })
      .eq('id', activeTournamentId);
    
    setTotalBracketRounds(totalRounds);
    
    const matchesToInsert = [];
    
    // STRATEGY: Create ONLY first round matches
    // Pairings: 1st vs last, 2nd vs second-to-last, etc.
    const numFirstRoundMatches = Math.floor(n / 2);
    
    for (let i = 0; i < numFirstRoundMatches; i++) {
      const topSeed = sortedAthletes[i];
      const bottomSeed = sortedAthletes[n - 1 - i];
      
      matchesToInsert.push({
        tournament_id: activeTournamentId,
        athlete_a: topSeed.athleteId,
        athlete_b: bottomSeed.athleteId,
        bout_date: tournamentDate,
        bout_type: tournamentBoutType,
        weapon: tournamentWeapon || null,
        status: 'pending',
        created_by: currentUserId,
        gym_id: userGymId,
        bracket_round: 1,
        round_number: null,
        score_a: null,
        score_b: null
      });
    }
    
    // Handle odd number of athletes (BYE)
    if (n % 2 !== 0) {
      const byeAthlete = sortedAthletes[0];
      const athleteName = athletes.find(a => a.id === byeAthlete.athleteId)?.full_name || byeAthlete.athleteId;
      console.log(`[Phase 2] ${athleteName} receives BYE`);
      // BYE is handled by advanceBracketRound when creating next round
    }
    
    console.log(`[Phase 2] Created ${matchesToInsert.length} matches for Round 1`);
    
    return matchesToInsert;
  };

  // Helper to get round name based on distance from final
  const getRoundName = (roundNum: number, totalRounds: number, sortedRounds: number[] = []) => {
    // ✅ Fallback: if totalRounds is 0, calculate from max round number
    const effectiveTotalRounds = totalRounds > 0 ? totalRounds : (sortedRounds.length > 0 ? Math.max(...sortedRounds) : 1);
    
    const roundsFromFinal = effectiveTotalRounds - roundNum;
    
    if (roundsFromFinal === 0) return '🏆 Finale';
    if (roundsFromFinal === 1) return 'Semifinali';
    if (roundsFromFinal === 2) return 'Quarti di Finale';
    if (roundsFromFinal === 3) return 'Ottavi di Finale';
    if (roundsFromFinal === 4) return 'Sedicesimi di Finale';
    
    return `Turno ${roundNum}`;
  };

  // Automatic advancement to next bracket round
  const advanceBracketRound = async (completedRound: number) => {
    if (!activeTournamentId || !userGymId || !currentUserId) return;

    setIsLoading(true);

    try {
      // 1. Get all completed matches from this round
      const { data: completedMatches, error: fetchError } = await supabase
        .from('bouts')
        .select('*')
        .eq('tournament_id', activeTournamentId)
        .eq('bracket_round', completedRound)
        .eq('status', 'approved')
        .not('score_a', 'is', null)
        .not('score_b', 'is', null);

      if (fetchError) throw fetchError;
      if (!completedMatches || completedMatches.length === 0) return;

      // 2. Check if ALL matches in this round are completed
      const { data: allRoundMatches } = await supabase
        .from('bouts')
        .select('id, status')
        .eq('tournament_id', activeTournamentId)
        .eq('bracket_round', completedRound);

      const allCompleted = allRoundMatches?.every(m => 
        m.status === 'approved' || m.status === 'cancelled'
      );

      if (!allCompleted) {
        console.log(`[Bracket] Round ${completedRound} not yet completed`);
        setIsLoading(false);
        return;
      }

      // ✅ STEP 1: Auto-approve all matches from completed round
      const { error: approveError } = await supabase
        .from('bouts')
        .update({
          status: 'approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString()
        })
        .eq('tournament_id', activeTournamentId)
        .eq('bracket_round', completedRound)
        .eq('status', 'pending');

      if (approveError) {
        console.error('[TournamentSection] Error approving round matches:', approveError);
        toast.error('Errore nell\'approvazione dei match');
        setIsLoading(false);
        return;
      }

      console.log(`[TournamentSection] ✅ Approved all matches from round ${completedRound}`);

      // 3. If only 1 match completed → IT'S THE FINAL → TOURNAMENT COMPLETED
      if (completedMatches.length === 1) {
        const finalMatch = completedMatches[0];
        const winnerId = finalMatch.score_a > finalMatch.score_b 
          ? finalMatch.athlete_a 
          : finalMatch.athlete_b;
        
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', winnerId)
          .single();

        toast.success(`🏆 Torneo completato! Vincitore: ${winnerProfile?.full_name}`);
        
        // Update tournament status
        await supabase
          .from('tournaments')
          .update({ status: 'completed' })
          .eq('id', activeTournamentId);
        
        await loadTournamentData(activeTournamentId);
        setIsLoading(false);
        return;
      }

      // 4. Determine winners
      const winners = completedMatches.map(match => ({
        athleteId: match.score_a > match.score_b ? match.athlete_a : match.athlete_b,
        previousMatchId: match.id
      }));

      // 5. Create matches for next round (consecutive pairings)
      const nextRoundMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextRoundMatches.push({
            tournament_id: activeTournamentId,
            athlete_a: winners[i].athleteId,
            athlete_b: winners[i + 1].athleteId,
            bout_date: tournamentDate,
            bout_type: tournamentBoutType,
            weapon: tournamentWeapon || null,
            status: 'pending',
            created_by: currentUserId,
            gym_id: userGymId,
            bracket_round: completedRound + 1,
            round_number: null,
            score_a: null,
            score_b: null
          });
        }
      }

      // 6. Insert next round matches
      if (nextRoundMatches.length > 0) {
        const { error: insertError } = await supabase
          .from('bouts')
          .insert(nextRoundMatches);

        if (insertError) throw insertError;

        const nextRoundName = getRoundName(completedRound + 1, totalBracketRounds);
        toast.success(`✅ Turno ${completedRound} completato! Creati match per: ${nextRoundName}`);
        
        await loadTournamentData(activeTournamentId);
      }
    } catch (error) {
      console.error('[Bracket] Error advancing round:', error);
      toast.error('Errore nell\'avanzamento del turno');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishTournament = async () => {
    if (!activeTournamentId || !currentUserId) return;

    setIsLoading(true);
    setIsClosingTournament(true);

    try {
      // 0. Recupera il ruolo dell'utente
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', currentUserId)
        .single();

      const userRole = profileData?.role;
      const isInstructor = userRole === 'istruttore' || userRole === 'capo_palestra';

      // ===== FASE 1: PASSA ALLA FASE 2 =====
      if (tournamentPhase === 1) {
        // ✅ STEP 1: Auto-approve ALL Phase 1 matches (both instructor and student mode)
        const { error: approveError } = await supabase
          .from('bouts')
          .update({
            status: 'approved',
            approved_by: currentUserId,
            approved_at: new Date().toISOString()
          })
          .eq('tournament_id', activeTournamentId)
          .is('bracket_round', null)  // Only Phase 1 matches (round-robin)
          .eq('status', 'pending');

        if (approveError) throw approveError;
        console.log('[TournamentSection] All Phase 1 matches auto-approved');

        // 2. Calcola seeding dalla Fase 1
        const rankings = calculateFinalRankings(athletes, matches);
        
        // 3. Genera accoppiamenti Fase 2
        const phase2Matches = await generatePhase2Bracket(rankings);
        
        // 4. Inserisci match Fase 2 nel database
        const { error: insertError } = await supabase
          .from('bouts')
          .insert(phase2Matches);
        
        if (insertError) throw insertError;

        // 5. Calcola il numero TOTALE di round dal numero di atleti (non dal max bracket_round!)
        const numAthletes = rankings.length;
        const totalRounds = Math.ceil(Math.log2(numAthletes));

        console.log('[TournamentSection] ✅ Setting total_bracket_rounds to:', totalRounds, 'for', numAthletes, 'athletes');

        const { error: tournamentError } = await supabase
          .from('tournaments')
          .update({ 
            phase: 2, 
            status: 'in_progress',
            total_bracket_rounds: totalRounds
          })
          .eq('id', activeTournamentId);

        if (tournamentError) throw tournamentError;

        // 6. Ricarica dati e aggiorna UI
        setTournamentPhase(2);
        setTotalBracketRounds(totalRounds);
        await loadTournamentData(activeTournamentId);
        
        toast.success('Fase 1 completata! Passaggio alla Fase 2 (eliminazione diretta)');
        setIsLoading(false);
        setIsClosingTournament(false);
        return;
      }

      // ===== FASE 2: CHIUDI TORNEO =====
      // ✅ STEP 1: Auto-approve ALL remaining Phase 2 matches (sia per istruttore che per studente)
      const { error: approveError } = await supabase
        .from('bouts')
        .update({
          status: 'approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString()
        })
        .eq('tournament_id', activeTournamentId)
        .not('bracket_round', 'is', null)  // Only Phase 2 matches
        .eq('status', 'pending');

      if (approveError) {
        console.error('[TournamentSection] Error approving Phase 2 matches:', approveError);
        toast.error('Errore nell\'approvazione dei match');
        setIsLoading(false);
        setIsClosingTournament(false);
        return;
      }

      console.log('[TournamentSection] ✅ Approved all Phase 2 matches');

      // 2. Cancella SOLO i match senza punteggio (match mai giocati)
      const { error: cancelError } = await supabase
        .from('bouts')
        .update({ status: 'cancelled' })
        .eq('tournament_id', activeTournamentId)
        .or('score_a.is.null,score_b.is.null');

      if (cancelError) throw cancelError;

      // 3. Chiudi il torneo
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', activeTournamentId);

      if (tournamentError) throw tournamentError;

      // 4. Se è studente, crea notifiche di approvazione per ogni match
      if (!isInstructor) {
        // Recupera tutti i match con punteggio che sono ancora in pending
        const { data: pendingMatches } = await supabase
          .from('bouts')
          .select('id, athlete_a, athlete_b, score_a, score_b')
          .eq('tournament_id', activeTournamentId)
          .eq('status', 'pending')
          .not('score_a', 'is', null)
          .not('score_b', 'is', null);

        if (pendingMatches && pendingMatches.length > 0) {
          // Per ogni match, crea 2 notifiche (una per ciascun atleta)
          const approvalNotifications = pendingMatches.flatMap(match => [
            {
              athlete_id: match.athlete_a,
              title: 'Match Torneo da Approvare',
              message: `Il torneo "${tournamentName}" è stato chiuso. Approva il tuo match per confermare il risultato (${match.score_a}-${match.score_b}).`,
              type: 'warning',
              created_by: currentUserId,
              related_bout_id: match.id,
              gym_id: userGymId
            },
            {
              athlete_id: match.athlete_b,
              title: 'Match Torneo da Approvare',
              message: `Il torneo "${tournamentName}" è stato chiuso. Approva il tuo match per confermare il risultato (${match.score_b}-${match.score_a}).`,
              type: 'warning',
              created_by: currentUserId,
              related_bout_id: match.id,
              gym_id: userGymId
            }
          ]);

          const { error: approvalNotifError } = await supabase
            .from('notifications')
            .insert(approvalNotifications);

          if (approvalNotifError) {
            console.error('[TournamentSection] Error creating approval notifications:', approvalNotifError);
          }
        }
      }

      // 5. IMPORTANTE: Aspettare che il DB si aggiorni
      await new Promise(resolve => setTimeout(resolve, 500));

      // 6. SOLO se è istruttore, calcola classifica e invia notifiche finali
      if (isInstructor) {
        // Calculate final rankings
        const rankings = calculateFinalRankings(athletes, matches);

        // Send notifications to all participants
        const notificationsToInsert = rankings.map(ranking => {
          // Emoji for top 3 positions
          const positionEmoji = 
            ranking.position === 1 ? '🥇' :
            ranking.position === 2 ? '🥈' :
            ranking.position === 3 ? '🥉' : '';

          return {
            athlete_id: ranking.athleteId,
            title: 'Torneo Concluso',
            message: `${positionEmoji} Il torneo "${tournamentName}" si è concluso!\n\n` +
                     `Posizione finale: ${ranking.position}°\n` +
                     `Vittorie: ${ranking.wins}/${ranking.totalMatches}\n` +
                     `Differenza stoccate: ${ranking.pointsDiff > 0 ? '+' : ''}${ranking.pointsDiff}`,
            type: ranking.position <= 3 ? 'success' : 'info',
            created_by: currentUserId,
            gym_id: userGymId
          };
        });

        // Insert notifications
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);

        if (notifError) {
          console.error('[TournamentSection] Error creating notifications:', notifError);
          // Don't block tournament closure for notification errors
        }
      }

      toast.success('Torneo concluso con successo!');
      
      // 7. Reset state
      setActiveTournamentId(null);
      setTournamentName('');
      setTournamentDate('');
      setTournamentWeapon(null);
      setTournamentBoutType('sparring');
      setTournamentCreatorId(null);
      setTournamentPhase(1);  // ✅ Reset phase
      setTotalBracketRounds(0);  // ✅ Reset bracket rounds
      setAthletes([]);
      setMatches([]);
      setMode('menu');
      
      onTournamentStateChange?.(false);
    } catch (error) {
      console.error('[TournamentSection] Error finishing tournament:', error);
      toast.error('Errore nella conclusione del torneo');
    } finally {
      setIsLoading(false);
      // IMPORTANTE: Resettare il flag dopo un delay per evitare race conditions
      setTimeout(() => setIsClosingTournament(false), 1000);
    }
  };

  const handleRefreshData = async () => {
    if (!activeTournamentId) return;
    
    console.log('[TournamentSection] Refreshing data for tournament:', activeTournamentId);
    setIsLoading(true);
    
    try {
      await loadTournamentData(activeTournamentId);
    } catch (error) {
      console.error('[TournamentSection] Error refreshing:', error);
      toast.error('Errore nell\'aggiornamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhase1 = async () => {
    if (!activeTournamentId) return;
    
    setIsLoading(true);
    
    try {
      // 1. Delete all Phase 2 matches
      const { error: deleteError } = await supabase
        .from('bouts')
        .delete()
        .eq('tournament_id', activeTournamentId)
        .not('bracket_round', 'is', null);
      
      if (deleteError) throw deleteError;
      
      // 2. Restore Phase 1 matches
      const { error: restoreError } = await supabase
        .from('bouts')
        .update({ status: 'pending' })
        .eq('tournament_id', activeTournamentId)
        .eq('status', 'cancelled')
        .is('bracket_round', null);
      
      if (restoreError) throw restoreError;
      
      // 3. Update tournament phase
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ phase: 1 })
        .eq('id', activeTournamentId);
      
      if (updateError) throw updateError;
      
      // 4. Reload data
      setTournamentPhase(1);
      await loadTournamentData(activeTournamentId);
      
      toast.success('Tornato alla Fase 1');
    } catch (error) {
      console.error('[TournamentSection] Error returning to Phase 1:', error);
      toast.error('Errore nel ritorno alla Fase 1');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTournament = async () => {
    if (!activeTournamentId) return;
    
    setIsLoading(true);
    setIsClosingTournament(true);
    
    try {
      // 1. Marca tutti i bouts come cancellati
      const { error: boutsError } = await supabase
        .from('bouts')
        .update({ status: 'cancelled' })
        .eq('tournament_id', activeTournamentId);
      
      if (boutsError) throw boutsError;
      
      // 2. Marca il torneo come cancellato
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'cancelled' })
        .eq('id', activeTournamentId);
      
      if (tournamentError) throw tournamentError;
      
      // 3. IMPORTANTE: Aspettare che il DB si aggiorni
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Torneo cancellato');
      
      // 4. Reset stato locale
      setActiveTournamentId(null);
      setTournamentName('');
      setTournamentDate('');
      setTournamentWeapon(null);
      setTournamentBoutType('sparring');
      setTournamentCreatorId(null);
      setTournamentPhase(1);  // ✅ Reset phase
      setTotalBracketRounds(0);  // ✅ Reset bracket rounds
      setAthletes([]);
      setMatches([]);
      onTournamentStateChange?.(false);
      
      // 5. Ora torna al menu
      setMode('menu');
      
    } catch (error: any) {
      console.error('[TournamentSection] Error canceling tournament:', error);
      toast.error('Errore: ' + error.message);
    } finally {
      setIsLoading(false);
      // IMPORTANTE: Resettare il flag dopo un delay per evitare race conditions
      setTimeout(() => setIsClosingTournament(false), 1000);
    }
  };

  // Menu view
  if (mode === 'menu') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Modalità Torneo
          </CardTitle>
          <CardDescription>
            Gestisci tornei con round robin automatico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={checkActiveTournament}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Verifica Tornei Attivi
          </Button>
          
          <Button
            onClick={() => setMode('setup')}
            className="w-full"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Torneo
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Setup view
  if (mode === 'setup') {
    return (
      <TournamentSetup
        onStart={handleStartTournament}
        onCancel={() => setMode('menu')}
      />
    );
  }

  // Matrix view
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{tournamentName}</CardTitle>
              <CardDescription>
                {new Date(tournamentDate).toLocaleDateString('it-IT')}
                {tournamentWeapon && ` • ${tournamentWeapon}`}
              </CardDescription>
            </div>
            <Button
              onClick={handleRefreshData}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <TournamentMatrix
        athletes={athletes}
        matches={matches}
        onRefresh={handleRefreshData}
        onFinish={handleFinishTournament}
        onExit={handleCancelTournament}
        currentUserId={currentUserId}
        isCreator={tournamentCreatorId === currentUserId}
        isLoading={isLoading}
        tournamentId={activeTournamentId}
        gymId={userGymId}
        tournamentPhase={tournamentPhase}
        onRoundComplete={advanceBracketRound}
        totalBracketRounds={totalBracketRounds}
      />
    </div>
  );
};
