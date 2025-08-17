import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, Award } from 'lucide-react';
import { RankingWidget } from './RankingWidget';

interface PersonalSummary {
  athlete_id: string;
  full_name: string;
  ranking_position: number;
  elo_rating: number;
  matches: number;
  trainings: number;
  wins: number;
  win_rate: number;
  avg_point_diff: number;
  avg_hits_given: number;
  avg_hits_received: number;
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
        _from: null,
        _to: null,
        _gender: null,
        _min_age: null,
        _max_age: null,
        _weapon: null,
        _athletes: [user.id],
        _tipo_match: null,
        _turni: null
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
  const formatHits = (hits: number) => hits.toFixed(1);
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Mai';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Ranking Widget - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RankingWidget customRankingData={{
          ranking_position: stats.ranking_position,
          elo_rating: stats.elo_rating,
          frequency_streak: 0, // Not available in PersonalSummary, will use default
          frequency_multiplier: 1.0 // Not available in PersonalSummary, will use default
        }} />
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sword className="h-5 w-5 text-primary" />
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
              <Shield className="h-5 w-5 text-secondary-foreground" />
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
              <Award className="h-5 w-5 text-accent-foreground" />
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
            <div className="p-2 bg-green-100 rounded-lg">
              <Sword className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Media Stoccate Date</p>
              <p className="text-2xl font-bold">{formatHits(stats.avg_hits_given)}</p>
              <p className="text-xs text-muted-foreground">Per assalto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Media Stoccate Subite</p>
              <p className="text-2xl font-bold">{formatHits(stats.avg_hits_received)}</p>
              <p className="text-xs text-muted-foreground">
                Ultimo: {formatDate(stats.last_training)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};