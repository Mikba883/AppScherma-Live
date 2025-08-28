import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

export const useUserRole = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [isInstructor, setIsInstructor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isGymOwner, setIsGymOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useUserRole] Effect triggered - user:', !!user, 'profile:', profile);
    
    if (profile) {
      console.log('[useUserRole] Profile found, role:', profile.role);
      setIsInstructor(profile.role === 'istruttore' || profile.role === 'capo_palestra');
      setIsStudent(profile.role === 'allievo');
      setIsGymOwner(profile.role === 'capo_palestra');
      setLoading(false);
    } else if (!user) {
      console.log('[useUserRole] No user, setting loading to false');
      setLoading(false);
    } else {
      console.log('[useUserRole] User exists but no profile yet, keeping loading true');
    }
  }, [profile, user]);

  return {
    isInstructor,
    isStudent,
    isGymOwner,
    loading,
    role: profile?.role
  };
};