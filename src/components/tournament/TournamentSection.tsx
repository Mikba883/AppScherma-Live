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
      // Load all bouts for this tournament, ordered by round_number
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (boutsError) throw boutsError;

      console.log('[TournamentSection] Loaded bouts:', bouts?.length, 'matches');

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
        round_number: bout.round_number
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
    if (!currentUserId || !userGymId) {
      toast.error('Utente non autenticato');
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
          gym_id: userGymId
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      console.log('[TournamentSection] Tournament created:', tournament);

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
        round_number: bout.round_number
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

  const handleFinishTournament = async () => {
    if (!activeTournamentId || !currentUserId) return;

    setIsLoading(true);
    setIsClosingTournament(true);

    try {
      // 1. Approve all completed matches (with scores)
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

      // 2. Cancel ALL pending matches (anche senza score)
      const { error: cancelError } = await supabase
        .from('bouts')
        .update({ status: 'cancelled' })
        .eq('tournament_id', activeTournamentId)
        .or('status.eq.pending,score_a.is.null,score_b.is.null');

      if (cancelError) throw cancelError;

      // 3. Close tournament
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', activeTournamentId);

      if (tournamentError) throw tournamentError;

      // 4. IMPORTANTE: Aspettare che il DB si aggiorni
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Calculate final rankings
      const rankings = calculateFinalRankings(athletes, matches);

      // 6. Send notifications to all participants
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

      toast.success('Torneo concluso con successo!');
      
      // 7. Reset state
      setActiveTournamentId(null);
      setTournamentName('');
      setTournamentDate('');
      setTournamentWeapon(null);
      setTournamentBoutType('sparring');
      setTournamentCreatorId(null);
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
      />
    </div>
  );
};
