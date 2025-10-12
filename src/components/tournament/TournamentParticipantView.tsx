import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TournamentMatch {
  bout_id: string;
  tournament_id: string;
  tournament_name: string;
  tournament_date: string;
  opponent_name: string;
  my_score: number | null;
  opponent_score: number | null;
  status: string;
  i_approved: boolean;
  opponent_approved: boolean;
  weapon: string | null;
  bout_type: string;
}

interface TournamentParticipantViewProps {
  onExit: () => void;
}

export const TournamentParticipantView = ({ onExit }: TournamentParticipantViewProps) => {
  const [tournaments, setTournaments] = useState<Record<string, TournamentMatch[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMyTournaments();
  }, []);

  const fetchMyTournaments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_tournament_matches');
      
      if (error) throw error;

      // Group matches by tournament
      const grouped = (data || []).reduce((acc: Record<string, TournamentMatch[]>, match: any) => {
        if (!acc[match.tournament_id]) {
          acc[match.tournament_id] = [];
        }
        acc[match.tournament_id].push(match);
        return acc;
      }, {});

      setTournaments(grouped);
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

  const handleApproveMatch = async (boutId: string) => {
    setUpdating(boutId);
    try {
      const { error } = await supabase.rpc('approve_tournament_match', {
        _bout_id: boutId
      });

      if (error) throw error;

      toast({
        title: 'Match Approvato',
        description: 'Hai approvato il match. Se anche il tuo avversario approva, diventerà ufficiale.',
      });

      // Refresh tournaments
      await fetchMyTournaments();
    } catch (error: any) {
      console.error('Error approving match:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile approvare il match',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento tornei...</div>;
  }

  if (Object.keys(tournaments).length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">Non sei attualmente in nessun torneo</p>
        <Button onClick={onExit}>Crea un Nuovo Torneo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Sei partecipante in {Object.keys(tournaments).length} torneo/i. Approva i tuoi match per confermare i risultati.
        </AlertDescription>
      </Alert>

      {Object.entries(tournaments).map(([tournamentId, matches]) => {
        const firstMatch = matches[0];
        const pendingApprovals = matches.filter(m => !m.i_approved && m.status === 'pending').length;
        const waitingOpponent = matches.filter(m => m.i_approved && !m.opponent_approved && m.status === 'pending').length;
        const approved = matches.filter(m => m.status === 'approved').length;

        return (
          <Card key={tournamentId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    {firstMatch.tournament_name}
                  </CardTitle>
                  <CardDescription>
                    {new Date(firstMatch.tournament_date).toLocaleDateString('it-IT')}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {pendingApprovals > 0 && (
                    <Badge variant="destructive">
                      {pendingApprovals} da approvare
                    </Badge>
                  )}
                  {waitingOpponent > 0 && (
                    <Badge variant="secondary">
                      {waitingOpponent} in attesa
                    </Badge>
                  )}
                  {approved > 0 && (
                    <Badge variant="default">
                      {approved} approvati
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.map((match) => (
                  <div
                    key={match.bout_id}
                    className={`p-4 rounded-lg border ${
                      match.status === 'approved'
                        ? 'bg-green-50 border-green-200'
                        : match.i_approved
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          vs {match.opponent_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {match.weapon ? match.weapon.charAt(0).toUpperCase() + match.weapon.slice(1) : 'Arma non specificata'} - {match.bout_type}
                        </div>
                        <div className="text-lg font-bold mt-2">
                          {match.my_score} - {match.opponent_score}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {match.status === 'approved' ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Ufficiale</span>
                          </div>
                        ) : match.i_approved ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm">In attesa dell'avversario</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleApproveMatch(match.bout_id)}
                            disabled={updating === match.bout_id}
                          >
                            {updating === match.bout_id ? 'Approvazione...' : 'Approva'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-center">
        <Button variant="outline" onClick={onExit}>
          Torna al Menu Tornei
        </Button>
      </div>
    </div>
  );
};