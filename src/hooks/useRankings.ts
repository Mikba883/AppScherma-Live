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
      // Use summary_by_athlete to get ranking data like in consultation page
      const { data: summaryData, error: summaryError } = await supabase.rpc('summary_by_athlete');
      if (summaryError) throw summaryError;

      const userSummary = summaryData?.find(s => s.athlete_id === user.id);

      if (userSummary) {
        setPersonalRanking({
          ranking_position: userSummary.ranking_position,
          elo_rating: userSummary.elo_rating,
          frequency_streak: 0, // Will be calculated from activity data
          frequency_multiplier: 1.0,
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