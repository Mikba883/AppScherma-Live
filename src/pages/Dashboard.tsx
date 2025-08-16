import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalStats } from '@/components/PersonalStats';
import { PendingNotifications } from '@/components/PendingNotifications';
import { RegisterBoutForm } from '@/components/RegisterBoutForm';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, BarChart3, Calendar, Plus, ArrowRight, User, Lock } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
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


      {/* Main Content */}
      <main className="w-full px-6 py-8 pb-20 md:pb-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Riepilogo</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Registra</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Le tue statistiche</CardTitle>
                <CardDescription>
                  Riepilogo delle tue performance nel team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PersonalStats />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Match da approvare</CardTitle>
                <CardDescription>
                  Gestisci i match in attesa della tua approvazione
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PendingNotifications />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registra nuovo match</CardTitle>
                <CardDescription>
                  Inserisci i dettagli del match appena disputato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegisterBoutForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;