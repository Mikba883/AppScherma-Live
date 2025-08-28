import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  user_id: string;
  full_name: string;
  birth_date: string;
  gender: 'M' | 'F' | 'X';
  role: 'allievo' | 'istruttore' | 'capo_palestra';
  email?: string;
  shift?: string;
  gym_id?: string;
  created_at: string;
}

export const useProfileQuery = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[useProfileQuery] Error fetching profile:', error);
        throw error;
      }
      
      return data as Profile;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user found' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await query.refetch(); // Refresh profile
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    profile: query.data || null,
    loading: query.isLoading,
    updateProfile,
    refetch: query.refetch,
  };
};