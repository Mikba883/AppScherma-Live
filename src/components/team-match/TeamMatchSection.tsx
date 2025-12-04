import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { toast } from 'sonner';
import { TeamMatchSetup } from './TeamMatchSetup';
import { TeamMatchLive } from './TeamMatchLive';
import { TeamSetup, TEAM_RELAY_SEQUENCE, TeamMatch, TeamMatchBout } from '@/types/team-match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export const TeamMatchSection = () => {
  const { user } = useAuth();
  const { gym } = useGym();
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  // Real-time subscription for team matches and bouts
  useEffect(() => {
    if (!gym?.id) return;

    const channel = supabase
      .channel('team-match-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_matches',
          filter: `gym_id=eq.${gym.id}`,
        },
        (payload) => {
          console.log('Team match update:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-team-match', gym.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_match_bouts',
        },
        (payload) => {
          console.log('Bout update:', payload);
          queryClient.invalidateQueries({ queryKey: ['team-match-bouts'] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gym?.id, queryClient]);

  // Fetch active team match
  const { data: activeMatch, isLoading: matchLoading } = useQuery({
    queryKey: ['active-team-match', gym?.id],
    queryFn: async () => {
      if (!gym?.id) return null;
      const { data, error } = await supabase
        .from('team_matches')
        .select('*')
        .eq('gym_id', gym.id)
        .in('status', ['setup', 'in_progress', 'overtime'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as TeamMatch | null;
    },
    enabled: !!gym?.id,
  });

  // Fetch bouts for active match
  const { data: bouts = [] } = useQuery({
    queryKey: ['team-match-bouts', activeMatch?.id],
    queryFn: async () => {
      if (!activeMatch?.id) return [];
      const { data, error } = await supabase
        .from('team_match_bouts')
        .select('*')
        .eq('team_match_id', activeMatch.id)
        .order('bout_number', { ascending: true });
      
      if (error) throw error;
      return data as TeamMatchBout[];
    },
    enabled: !!activeMatch?.id,
  });

  // Fetch member names for display
  const { data: members = [] } = useQuery({
    queryKey: ['gym-members-names', gym?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_gym_member_names');
      if (error) throw error;
      return data || [];
    },
    enabled: !!gym?.id,
  });

  const getMemberName = (userId: string | null) => {
    if (!userId) return '';
    const member = members.find((m: any) => m.user_id === userId);
    return member?.full_name || '';
  };

  const teamAAthletes = activeMatch ? [
    { id: activeMatch.team_a_athlete_1 || '', name: getMemberName(activeMatch.team_a_athlete_1) },
    { id: activeMatch.team_a_athlete_2 || '', name: getMemberName(activeMatch.team_a_athlete_2) },
    { id: activeMatch.team_a_athlete_3 || '', name: getMemberName(activeMatch.team_a_athlete_3) },
  ] : [];

  const teamBAthletes = activeMatch ? [
    { id: activeMatch.team_b_athlete_1 || '', name: getMemberName(activeMatch.team_b_athlete_1) },
    { id: activeMatch.team_b_athlete_2 || '', name: getMemberName(activeMatch.team_b_athlete_2) },
    { id: activeMatch.team_b_athlete_3 || '', name: getMemberName(activeMatch.team_b_athlete_3) },
  ] : [];

  // Create match mutation
  const createMatchMutation = useMutation({
    mutationFn: async (setup: TeamSetup) => {
      if (!user?.id || !gym?.id) throw new Error('Non autenticato');

      // Create the match
      const { data: match, error: matchError } = await supabase
        .from('team_matches')
        .insert({
          match_date: format(setup.matchDate, 'yyyy-MM-dd'),
          weapon: setup.weapon || null,
          gym_id: gym.id,
          created_by: user.id,
          status: 'in_progress',
          team_a_name: setup.teamAName,
          team_a_athlete_1: setup.teamA[0],
          team_a_athlete_2: setup.teamA[1],
          team_a_athlete_3: setup.teamA[2],
          team_b_name: setup.teamBName,
          team_b_athlete_1: setup.teamB[0],
          team_b_athlete_2: setup.teamB[1],
          team_b_athlete_3: setup.teamB[2],
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Create all 9 bout records
      const boutsToInsert = TEAM_RELAY_SEQUENCE.map((seq) => ({
        team_match_id: match.id,
        bout_number: seq.bout,
        athlete_a_index: seq.teamAIndex,
        athlete_b_index: seq.teamBIndex,
        target_score: seq.target,
        start_score_a: 0,
        start_score_b: 0,
        status: seq.bout === 1 ? 'in_progress' : 'pending',
        started_at: seq.bout === 1 ? new Date().toISOString() : null,
      }));

      const { error: boutsError } = await supabase
        .from('team_match_bouts')
        .insert(boutsToInsert);

      if (boutsError) throw boutsError;

      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-team-match'] });
      queryClient.invalidateQueries({ queryKey: ['team-match-bouts'] });
      toast.success('Incontro a squadre creato!');
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Update score mutation
  const updateScoreMutation = useMutation({
    mutationFn: async ({ team, increment }: { team: 'A' | 'B'; increment: number }) => {
      if (!activeMatch) throw new Error('Nessun match attivo');

      const currentBout = bouts.find((b) => b.bout_number === activeMatch.current_bout);
      if (!currentBout) throw new Error('Assalto non trovato');

      const newTotalA = team === 'A' ? activeMatch.total_score_a + increment : activeMatch.total_score_a;
      const newTotalB = team === 'B' ? activeMatch.total_score_b + increment : activeMatch.total_score_b;
      const newBoutTouchesA = team === 'A' ? currentBout.bout_touches_a + increment : currentBout.bout_touches_a;
      const newBoutTouchesB = team === 'B' ? currentBout.bout_touches_b + increment : currentBout.bout_touches_b;

      // Update match totals
      const { error: matchError } = await supabase
        .from('team_matches')
        .update({
          total_score_a: newTotalA,
          total_score_b: newTotalB,
        })
        .eq('id', activeMatch.id);

      if (matchError) throw matchError;

      // Update bout touches
      const { error: boutError } = await supabase
        .from('team_match_bouts')
        .update({
          bout_touches_a: newBoutTouchesA,
          bout_touches_b: newBoutTouchesB,
        })
        .eq('id', currentBout.id);

      if (boutError) throw boutError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-team-match'] });
      queryClient.invalidateQueries({ queryKey: ['team-match-bouts'] });
    },
  });

  // Complete bout mutation
  const completeBoutMutation = useMutation({
    mutationFn: async (timeElapsed: number) => {
      if (!activeMatch) throw new Error('Nessun match attivo');

      const currentBout = bouts.find((b) => b.bout_number === activeMatch.current_bout);
      if (!currentBout) throw new Error('Assalto non trovato');

      // Complete current bout
      const { error: boutError } = await supabase
        .from('team_match_bouts')
        .update({
          status: 'completed',
          end_score_a: activeMatch.total_score_a,
          end_score_b: activeMatch.total_score_b,
          time_elapsed: timeElapsed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentBout.id);

      if (boutError) throw boutError;

      // If not last bout, start next one
      if (activeMatch.current_bout < 9) {
        const nextBoutNumber = activeMatch.current_bout + 1;

        // Update match current bout
        const { error: matchError } = await supabase
          .from('team_matches')
          .update({ current_bout: nextBoutNumber })
          .eq('id', activeMatch.id);

        if (matchError) throw matchError;

        // Start next bout
        const { error: nextBoutError } = await supabase
          .from('team_match_bouts')
          .update({
            status: 'in_progress',
            start_score_a: activeMatch.total_score_a,
            start_score_b: activeMatch.total_score_b,
            started_at: new Date().toISOString(),
          })
          .eq('team_match_id', activeMatch.id)
          .eq('bout_number', nextBoutNumber);

        if (nextBoutError) throw nextBoutError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-team-match'] });
      queryClient.invalidateQueries({ queryKey: ['team-match-bouts'] });
    },
  });

  // Complete match mutation
  const completeMatchMutation = useMutation({
    mutationFn: async (winner: 'A' | 'B') => {
      if (!activeMatch) throw new Error('Nessun match attivo');

      const { error } = await supabase
        .from('team_matches')
        .update({
          status: 'completed',
          winner,
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeMatch.id);

      if (error) throw error;
    },
    onSuccess: (_, winner) => {
      queryClient.invalidateQueries({ queryKey: ['active-team-match'] });
      const winnerName = winner === 'A' ? activeMatch?.team_a_name : activeMatch?.team_b_name;
      toast.success(`${winnerName} vince l'incontro!`);
    },
  });

  // Start overtime mutation
  const startOvertimeMutation = useMutation({
    mutationFn: async () => {
      if (!activeMatch) throw new Error('Nessun match attivo');

      const { error } = await supabase
        .from('team_matches')
        .update({ status: 'overtime' })
        .eq('id', activeMatch.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-team-match'] });
      toast.info('Minuto supplementare iniziato!');
    },
  });

  // Cancel match mutation
  const cancelMatchMutation = useMutation({
    mutationFn: async () => {
      if (!activeMatch) throw new Error('Nessun match attivo');

      const { error } = await supabase
        .from('team_matches')
        .update({ status: 'cancelled' })
        .eq('id', activeMatch.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-team-match'] });
      toast.info('Incontro annullato');
    },
  });

  const handleScoreUpdate = useCallback((team: 'A' | 'B', increment: number) => {
    updateScoreMutation.mutate({ team, increment });
  }, [updateScoreMutation]);

  if (matchLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  // Show setup if no active match
  if (!activeMatch) {
    return (
      <TeamMatchSetup
        onStartMatch={(setup) => createMatchMutation.mutate(setup)}
        isLoading={createMatchMutation.isPending}
      />
    );
  }

  // Show completed state
  if (activeMatch.status === 'completed') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Incontro Completato
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-2xl font-bold mb-2">
            {activeMatch.total_score_a} - {activeMatch.total_score_b}
          </p>
          <p className="text-lg">
            Vince{' '}
            <span className="font-bold">
              {activeMatch.winner === 'A' ? activeMatch.team_a_name : activeMatch.team_b_name}
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isLive && (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-xs">Live - Sincronizzazione attiva</span>
        </Badge>
      )}
      <TeamMatchLive
        match={activeMatch}
        bouts={bouts}
        teamAAthletes={teamAAthletes}
        teamBAthletes={teamBAthletes}
        onScoreUpdate={handleScoreUpdate}
        onBoutComplete={(time) => completeBoutMutation.mutate(time)}
        onMatchComplete={(winner) => completeMatchMutation.mutate(winner)}
        onStartOvertime={() => startOvertimeMutation.mutate()}
        onCancelMatch={() => cancelMatchMutation.mutate()}
      />
    </div>
  );
};
