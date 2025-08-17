import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

export const useUserRole = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [isInstructor, setIsInstructor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setIsInstructor(profile.role === 'istruttore');
      setIsStudent(profile.role === 'allievo');
      setLoading(false);
    } else if (!user) {
      setLoading(false);
    }
  }, [profile, user]);

  return {
    isInstructor,
    isStudent,
    loading,
    role: profile?.role
  };
};