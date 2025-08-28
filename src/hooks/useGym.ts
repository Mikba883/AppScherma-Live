import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface Gym {
  id: string;
  name: string;
  logo_url: string | null;
  owner_name: string;
  owner_email: string;
  owner_id: string;
  shifts: string[] | null;
  created_at: string;
  updated_at: string;
}

export const useGym = () => {
  const { profile } = useProfile();
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.gym_id) {
      fetchGym();
    } else {
      setGym(null);
      setLoading(false);
    }
  }, [profile?.gym_id]);

  const fetchGym = async () => {
    if (!profile?.gym_id) return;

    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', profile.gym_id)
        .single();

      if (error) throw error;
      setGym(data);
    } catch (error) {
      console.error('Error fetching gym:', error);
      setGym(null);
    } finally {
      setLoading(false);
    }
  };

  const updateGym = async (updates: Partial<Gym>) => {
    if (!gym) return { error: 'No gym found' };

    try {
      const { error } = await supabase
        .from('gyms')
        .update(updates)
        .eq('id', gym.id);

      if (error) throw error;
      
      await fetchGym();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    gym,
    loading,
    updateGym,
    refetch: fetchGym,
    isOwner: profile?.user_id === gym?.owner_id
  };
};