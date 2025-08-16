import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalStats } from '@/components/PersonalStats';
import { PendingNotifications } from '@/components/PendingNotifications';
import { RegisterBoutForm } from '@/components/RegisterBoutForm';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, BarChart3, Calendar, Plus } from 'lucide-react';

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0">
              <div className="min-w-0 flex-shrink">
                <h1 className="text-xl lg:text-2xl font-bold text-primary">Fanfulla Scherma</h1>
                <p className="text-sm lg:text-base text-muted-foreground truncate">
                  Benvenuto, {profile?.full_name || user.email}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Navigation />
              </div>
            </div>
            
            {/* Desktop logout button */}
            <div className="hidden md:block flex-shrink-0 ml-4">
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile logout button - Fixed bottom right */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={signOut}
          className="shadow-lg bg-card border-2"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Esci
        </Button>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
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