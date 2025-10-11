import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalStats } from './PersonalStats';
import { NotificationsPanel } from './NotificationsPanel';
import { RegisterBoutForm } from './RegisterBoutForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Bell, Plus, Trophy, Users } from 'lucide-react';
import { StudentTournamentSection } from './tournament/StudentTournamentSection';
import { MyTournaments } from './tournament/MyTournaments';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const StudentDashboard = () => {
  console.log('StudentDashboard - Component loaded');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
      // Clear the search param after setting the tab
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  return (
    <main className="w-full px-6 py-8 pb-20 md:pb-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Statistiche</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifiche</span>
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registra</span>
          </TabsTrigger>
          <TabsTrigger value="tournament" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Torneo</span>
          </TabsTrigger>
          <TabsTrigger value="my-tournaments" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">I Miei Tornei</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Le tue statistiche</CardTitle>
              <CardDescription>
                Riepilogo delle tue performance personali
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalStats />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationsPanel />
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

        <TabsContent value="tournament" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Crea Torneo</CardTitle>
              <CardDescription>
                Organizza un torneo con gli atleti della tua palestra. I match richiederanno l'approvazione di tutti gli atleti coinvolti.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentTournamentSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-tournaments" className="space-y-6">
          <MyTournaments />
        </TabsContent>
      </Tabs>
    </main>
  );
};