import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Calendar, TrendingUp } from 'lucide-react';

interface PersonalSummary {
  athlete_id: string;
  full_name: string;
  matches: number;
  trainings: number;
  wins: number;
  win_rate: number;
  avg_point_diff: number;
  last_training: string | null;
}

export const PersonalStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PersonalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPersonalStats();
    }
  }, [user]);

  const fetchPersonalStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('summary_by_athlete', {
        _athletes: [user.id]
      });

      if (error) throw error;
      setStats(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching personal stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Nessun dato disponibile. Inizia a registrare i tuoi match!
        </p>
      </div>
    );
  }

  const formatWinRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;
  const formatPointDiff = (diff: number) => diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Mai';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Match Totali</p>
              <p className="text-2xl font-bold">{stats.matches}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Allenamenti</p>
              <p className="text-2xl font-bold">{stats.trainings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Trophy className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{formatWinRate(stats.win_rate)}</p>
                <Badge variant={stats.win_rate > 0.5 ? "default" : "secondary"}>
                  {stats.wins}/{stats.matches}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scarto Medio</p>
              <p className="text-2xl font-bold">{formatPointDiff(stats.avg_point_diff)}</p>
              <p className="text-xs text-muted-foreground">
                Ultimo: {formatDate(stats.last_training)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};