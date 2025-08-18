import { Trophy, TrendingUp } from 'lucide-react';
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
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};