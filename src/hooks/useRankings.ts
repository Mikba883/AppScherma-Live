import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RankingData {
  ranking_position: number;
  athlete_id: string;
  full_name: string;
  elo_rating: number;
  peak_rating: number;
  matches_played: number;
  frequency_streak: number;
  frequency_multiplier: number;
  last_activity_date: string | null;
}

export interface PersonalRanking {
  ranking_position: number;
  elo_rating: number;
  frequency_streak: number;
  frequency_multiplier: number;
}

export const useRankings = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [personalRanking, setPersonalRanking] = useState<PersonalRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRankings();
      fetchPersonalRanking();
    }
  }, [user]);

  const fetchRankings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_rankings');
      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  };

  const fetchPersonalRanking = async () => {
    if (!user) return;

    try {
      // Use the new dedicated function to get personal ranking with ELO
      const { data: rankingData, error: rankingError } = await supabase.rpc('get_personal_ranking_with_elo', {
        _athlete_id: user.id
      });
      if (rankingError) throw rankingError;

      if (rankingData && rankingData.length > 0) {
        const ranking = rankingData[0];
        setPersonalRanking({
          ranking_position: ranking.ranking_position,
          elo_rating: ranking.elo_rating,
          frequency_streak: ranking.frequency_streak || 0,
          frequency_multiplier: ranking.frequency_multiplier || 1.0,
        });
      } else {
        // User has no ranking data yet
        setPersonalRanking(null);
      }
    } catch (error) {
      console.error('Error fetching personal ranking:', error);
      setPersonalRanking(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    rankings,
    personalRanking,
    loading,
    refetch: () => {
      fetchRankings();
      fetchPersonalRanking();
    },
  };
};