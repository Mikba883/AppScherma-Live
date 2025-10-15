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

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Check for active tournament on mount
  useEffect(() => {
    if (currentUserId && userGymId) {
      checkActiveTournament();
    }
  }, [currentUserId, userGymId]);

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
      const { data, error } = await supabase.rpc('get_my_active_tournament');
      
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
      }
    } catch (error) {
      console.error('[TournamentSection] Error in checkActiveTournament:', error);
    }
  };

  const loadTournamentData = async (tournamentId: string) => {
    console.log('[TournamentSection] Loading tournament data:', tournamentId);
    setIsLoading(true);
    
    try {
      // Load all bouts for this tournament
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select('*')
        .eq('tournament_id', tournamentId);

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
        status: bout.status
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

      // 2. Generate all matches (round-robin, no duplicates)
      const boutsToInsert = [];
      for (let i = 0; i < selectedAthletes.length; i++) {
        for (let j = i + 1; j < selectedAthletes.length; j++) {
          boutsToInsert.push({
            tournament_id: tournament.id,
            athlete_a: selectedAthletes[i].id,
            athlete_b: selectedAthletes[j].id,
            bout_date: date,
            bout_type: boutType,
            weapon: weapon || null,
            status: 'pending',
            created_by: currentUserId,
            gym_id: userGymId,
            score_a: null,
            score_b: null
          });
        }
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
        status: bout.status
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

  const handleFinishTournament = async () => {
    if (!activeTournamentId || !currentUserId) return;

    setIsLoading(true);

    try {
      // 1. Approve all completed matches
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

      // 2. Close tournament
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', activeTournamentId);

      if (tournamentError) throw tournamentError;

      toast.success('Torneo concluso con successo!');
      
      // 3. Reset state
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
    }
  };

  const handleRefreshData = async () => {
    if (!activeTournamentId) return;
    
    console.log('[TournamentSection] Refreshing data...');
    await loadTournamentData(activeTournamentId);
    toast.success('Dati aggiornati');
  };

  const handleCancelTournament = async () => {
    if (!activeTournamentId) return;
    
    setIsLoading(true);
    
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
      
      toast.success('Torneo cancellato');
      
      // 3. Reset stato locale
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
    } catch (error: any) {
      console.error('[TournamentSection] Error canceling tournament:', error);
      toast.error('Errore: ' + error.message);
    } finally {
      setIsLoading(false);
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
      />
    </div>
  );
};
