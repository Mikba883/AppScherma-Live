import { useAuth } from '@/hooks/useAuth';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useGymQuery } from '@/hooks/useGymQuery';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { InstructorDashboard } from '@/components/InstructorDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, BarChart3, Calendar, Plus, ArrowRight, User, Lock, Building2, AlertCircle, Settings } from 'lucide-react';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useMemo } from 'react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfileQuery();
  const { gym, loading: gymLoading } = useGymQuery();
  
  // Derive user role from profile
  const isInstructor = useMemo(() => {
    return profile?.role === 'istruttore' || profile?.role === 'capo_palestra';
  }, [profile]);
  
  const isStudent = useMemo(() => {
    return profile?.role === 'allievo';
  }, [profile]);

  const isGymAdmin = useMemo(() => {
    return profile?.role === 'capo_palestra';
  }, [profile]);

  if (authLoading || profileLoading || gymLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has a gym assigned
  if (profile && (!profile.gym_id || !gym)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Benvenuto in Fanfulla Scherma</CardTitle>
            <CardDescription>
              {!profile.gym_id 
                ? "Non sei ancora associato a nessuna palestra. Puoi creare una nuova palestra o attendere un invito."
                : "Caricamento informazioni palestra..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile.gym_id && (
              <>
                <Link to="/create-gym" className="block">
                  <Button className="w-full">
                    <Building2 className="h-4 w-4 mr-2" />
                    Crea Nuova Palestra
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <InstallPrompt />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-6 py-6">
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center max-w-none">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4">
                {gym?.logo_url && (
                  <img 
                    src={gym.logo_url} 
                    alt={gym.name} 
                    className="h-12 w-12 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-primary">{gym?.name || 'Fanfulla Scherma'}</h1>
                  <p className="text-lg text-muted-foreground mt-1">
                    Benvenuto, {profile?.full_name || user.email}
                  </p>
                </div>
              </div>
              <Navigation />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="px-6 py-3">
                  <User className="w-5 h-5 mr-3" />
                  <span className="text-base">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/change-password" className="flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Cambia Password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex justify-between items-center">
            <div className="flex items-center gap-2">
              {gym?.logo_url && (
                <img 
                  src={gym.logo_url} 
                  alt={gym.name} 
                  className="h-8 w-8 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-primary">{gym?.name || 'Fanfulla Scherma'}</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.full_name || user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/consultation">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <span>Analisi</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              
              {isGymAdmin && (
                <Link to="/gym-admin">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to="/change-password" className="flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Cambia Password
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content - Conditional based on role */}
      {isInstructor ? <InstructorDashboard /> : <StudentDashboard />}
    </div>
  );
};

export default Dashboard;