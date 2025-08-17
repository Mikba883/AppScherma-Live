import { Trophy, TrendingUp, Zap, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRankings } from '@/hooks/useRankings';

interface CustomRankingData {
  ranking_position: number;
  elo_rating: number;
  frequency_streak: number;
  frequency_multiplier: number;
}

interface RankingWidgetProps {
  customRankingData?: CustomRankingData;
}

export const RankingWidget = ({ customRankingData }: RankingWidgetProps = {}) => {
  const { personalRanking: hookRanking, loading } = useRankings();
  
  // Use custom data if provided, otherwise use hook data
  const personalRanking = customRankingData || hookRanking;

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!personalRanking) {
    return (
      <Card className="bg-gradient-to-br from-muted/50 via-muted/25 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted rounded-lg">
              <Trophy className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ranking</p>
              <p className="text-lg font-bold">Non classificato</p>
              <p className="text-xs text-muted-foreground">Gioca il tuo primo match!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (position: number) => {
    if (position <= 3) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (position <= 10) return <TrendingUp className="h-5 w-5 text-primary" />;
    return <Trophy className="h-5 w-5 text-muted-foreground" />;
  };

  const getPositionSuffix = (position: number) => {
    if (position === 1) return 'º';
    if (position === 2) return 'º';
    if (position === 3) return 'º';
    return 'º';
  };

  const getStreakBadgeVariant = (streak: number) => {
    if (streak >= 4) return 'default';
    if (streak >= 2) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getRankIcon(personalRanking.ranking_position)}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Classifica</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {personalRanking.ranking_position}{getPositionSuffix(personalRanking.ranking_position)}
                </p>
                {personalRanking.ranking_position <= 3 && (
                  <Badge variant="default" className="text-xs">
                    Podio
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-primary">
                  {personalRanking.elo_rating} ELO
                </span>
                {personalRanking.frequency_streak > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <Badge variant={getStreakBadgeVariant(personalRanking.frequency_streak)} className="text-xs">
                      {personalRanking.frequency_streak}w streak
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {personalRanking.frequency_multiplier > 1.0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  +{Math.round((personalRanking.frequency_multiplier - 1) * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Bonus Frequenza</p>
            </div>
          )}
        </div>
        
        {personalRanking.frequency_streak > 0 && (
          <div className="mt-4 pt-4 border-t border-primary/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Streak attiva da {personalRanking.frequency_streak} settimane</span>
              </div>
              <span>Moltiplicatore: x{personalRanking.frequency_multiplier.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};