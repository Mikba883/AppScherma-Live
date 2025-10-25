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

  const updateMemberShift = async (userId: string, shift: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ shift })
        .eq('user_id', userId);

      if (error) throw error;
      await fetchMembers();
      return { error: null };
    } catch (error) {
      console.error('Error updating member shift:', error);
      return { error };
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('remove_gym_member', {
        _member_user_id: userId
      });

      if (error) throw error;
      await fetchMembers();
      return { error: null };
    } catch (error) {
      console.error('Error removing member:', error);
      return { error };
    }
  };

  return {
    members,
    loading,
    refetch: fetchMembers,
    updateMemberShift,
    removeMember
  };
};
