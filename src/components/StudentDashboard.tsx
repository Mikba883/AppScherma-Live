import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalStats } from './PersonalStats';
import { PendingNotifications } from './PendingNotifications';
import { RegisterBoutForm } from './RegisterBoutForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calendar, Plus } from 'lucide-react';

export const StudentDashboard = () => {
  console.log('StudentDashboard - Component loaded');
  
  return (
    <main className="w-full px-6 py-8 pb-20 md:pb-8">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Le Tue Statistiche</span>
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
                Riepilogo delle tue performance personali
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
  );
};