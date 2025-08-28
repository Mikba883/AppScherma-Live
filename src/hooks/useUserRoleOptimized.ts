import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useProfileQuery } from './useProfileQuery';

export const useUserRoleOptimized = () => {
  const { user } = useAuth();
  const { profile, loading } = useProfileQuery();

  const isInstructor = useMemo(() => {
    return profile?.role === 'istruttore' || profile?.role === 'capo_palestra';
  }, [profile]);

  const isStudent = useMemo(() => {
    return profile?.role === 'allievo';
  }, [profile]);

  const isGymOwner = useMemo(() => {
    return profile?.role === 'capo_palestra';
  }, [profile]);

  return {
    isInstructor,
    isStudent,
    isGymOwner,
    loading: loading && !!user,
    role: profile?.role
  };
};