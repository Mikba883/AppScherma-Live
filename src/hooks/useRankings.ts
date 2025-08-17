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
      // Get position from rankings function - this includes all the data we need
      const { data: allRankings, error: positionError } = await supabase.rpc('get_rankings');
      if (positionError) throw positionError;

      const userPosition = allRankings?.find(r => r.athlete_id === user.id);

      if (userPosition) {
        setPersonalRanking({
          ranking_position: userPosition.ranking_position,
          elo_rating: userPosition.elo_rating,
          frequency_streak: userPosition.frequency_streak,
          frequency_multiplier: userPosition.frequency_multiplier,
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