import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { InstructorDashboard } from '@/components/InstructorDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, BarChart3, Calendar, Plus, ArrowRight, User, Lock } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isInstructor, isStudent, loading: roleLoading } = useUserRole();

  if (authLoading || profileLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-6 py-6">
          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center max-w-none">
            <div className="flex items-center gap-12">
              <div>
                <h1 className="text-3xl font-bold text-primary">Fanfulla Scherma</h1>
                <p className="text-lg text-muted-foreground mt-1">
                  Benvenuto, {profile?.full_name || user.email}
                </p>
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
            <div>
              <h1 className="text-xl font-bold text-primary">Fanfulla Scherma</h1>
              <p className="text-sm text-muted-foreground">
                Benvenuto, {profile?.full_name || user.email}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/consultation">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <span>Analisi</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              
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