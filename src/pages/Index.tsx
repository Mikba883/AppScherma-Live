import { useAuth } from '@/hooks/useAuth';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import { AuthLoadingSkeleton } from '@/components/LoadingSkeleton';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingSkeleton />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard />;
};

export default Index;
