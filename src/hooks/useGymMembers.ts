import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from './useGym';

export interface GymMember {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  shift: string | null;
  birth_date: string;
  gender: string;
}

export const useGymMembers = () => {
  const { gym } = useGym();
  const [members, setMembers] = useState<GymMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gym?.id) {
      fetchMembers();
    } else {
      setMembers([]);
      setLoading(false);
    }
  }, [gym?.id]);

  const fetchMembers = async () => {
    if (!gym?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('gym_id', gym.id);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching gym members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    members,
    loading,
    refetch: fetchMembers
  };
};