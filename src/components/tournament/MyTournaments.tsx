import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TournamentMatchCard } from './TournamentMatchCard';
import { Trophy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TournamentMatch {
  bout_id: string;
  tournament_id: string;
  tournament_name: string;
  tournament_date: string;
  bout_date: string;
  weapon: string | null;
  bout_type: string;
  opponent_id: string;
  opponent_name: string;
  my_score: number;
  opponent_score: number;
  status: string;
  i_approved: boolean;
  opponent_approved: boolean;
  created_by: string;
}

interface GroupedTournament {
  id: string;
  name: string;
  date: string;
  matches: TournamentMatch[];
}

export const MyTournaments = () => {
  const [tournaments, setTournaments] = useState<GroupedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMyTournaments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_tournament_matches');

      if (error) throw error;

      // Group matches by tournament
      const grouped: { [key: string]: GroupedTournament } = {};
      
      data?.forEach((match: TournamentMatch) => {
        if (!grouped[match.tournament_id]) {
          grouped[match.tournament_id] = {
            id: match.tournament_id,
            name: match.tournament_name,
            date: match.tournament_date,
            matches: [],
          };
        }
        grouped[match.tournament_id].matches.push(match);
      });

      setTournaments(Object.values(grouped));
    } catch (error: any) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i tornei',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTournaments();
  }, []);

  const handleMatchApproved = () => {
    // Refresh tournaments after approval
    fetchMyTournaments();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nessun torneo in corso al momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {tournaments.map((tournament) => {
        const pendingCount = tournament.matches.filter(m => !m.i_approved && m.status === 'pending').length;
        const approvedCount = tournament.matches.filter(m => m.status === 'approved').length;

        return (
          <Card key={tournament.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    {tournament.name}
                  </CardTitle>
                  <CardDescription>
                    Data: {new Date(tournament.date).toLocaleDateString('it-IT')}
                  </CardDescription>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">
                    {approvedCount} / {tournament.matches.length} approvati
                  </div>
                  {pendingCount > 0 && (
                    <div className="text-warning font-medium">
                      {pendingCount} in attesa
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tournament.matches.map((match) => (
                  <TournamentMatchCard
                    key={match.bout_id}
                    match={match}
                    onApproved={handleMatchApproved}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
