import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileQuery } from './useProfileQuery';

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

export const useGymQuery = () => {
  const { profile } = useProfileQuery();

  const query = useQuery({
    queryKey: ['gym', profile?.gym_id],
    queryFn: async () => {
      if (!profile?.gym_id) return null;

      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', profile.gym_id)
        .single();

      if (error) {
        console.error('Error fetching gym:', error);
        throw error;
      }
      
      return data as Gym;
    },
    enabled: !!profile?.gym_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateGym = async (updates: Partial<Gym>) => {
    if (!query.data) return { error: 'No gym found' };

    try {
      const { error } = await supabase
        .from('gyms')
        .update(updates)
        .eq('id', query.data.id);

      if (error) throw error;
      
      await query.refetch();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    gym: query.data || null,
    loading: query.isLoading,
    updateGym,
    refetch: query.refetch,
    isOwner: profile?.user_id === query.data?.owner_id
  };
};