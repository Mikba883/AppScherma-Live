import { useState, useEffect } from 'react';
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

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      console.log('[useProfile] No user found');
      return;
    }
    
    console.log('[useProfile] Fetching profile for user:', user.id);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[useProfile] Error fetching profile:', error);
        throw error;
      }
      
      console.log('[useProfile] Profile fetched successfully:', data);
      setProfile(data as Profile);
    } catch (error) {
      console.error('[useProfile] Catch block - Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user found' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchProfile(); // Refresh profile
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile,
  };
};