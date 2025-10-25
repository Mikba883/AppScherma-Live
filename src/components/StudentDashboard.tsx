import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalStats } from './PersonalStats';
import { NotificationsPanel } from './NotificationsPanel';
import { RegisterBoutForm } from './RegisterBoutForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BarChart3, Bell, Plus, Trophy, Settings } from 'lucide-react';
import { TournamentSection } from './tournament/TournamentSection';
import { AccountSettings } from './AccountSettings';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

export const StudentDashboard = () => {
  console.log('[StudentDashboard] Component loaded');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showTabChangeDialog, setShowTabChangeDialog] = useState(false);

  useUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    console.log('[StudentDashboard] Active tab changed to:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      handleTabChange(tab);
      // Clear the search param after setting the tab
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'tournament' && hasUnsavedChanges) {
      setPendingTab(newTab);
      setShowTabChangeDialog(true);
    } else {
      setActiveTab(newTab);
      setHasUnsavedChanges(false);
    }
  };

  const handleTournamentStateChange = (hasUnsaved: boolean) => {
    setHasUnsavedChanges(hasUnsaved);
  };
  
  return (
    <main className="w-full px-6 py-8 pb-20 md:pb-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
          <TabsTrigger value="settings" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Impostazioni</span>
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
              <CardTitle>Tornei</CardTitle>
              <CardDescription>
                Crea o partecipa a tornei con gli atleti della tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TournamentSection onTournamentStateChange={handleTournamentStateChange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Account</CardTitle>
              <CardDescription>
                Gestisci le tue preferenze e il tuo account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tab Change Warning Dialog */}
      <AlertDialog open={showTabChangeDialog} onOpenChange={setShowTabChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attenzione: Torneo in Corso</AlertDialogTitle>
            <AlertDialogDescription>
              Hai un torneo in corso con dati non salvati. Se cambi tab, i dati inseriti andranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogAction 
              onClick={() => {
                setShowTabChangeDialog(false);
                setPendingTab(null);
              }}
              className="w-full sm:w-auto order-first"
            >
              Rimani qui
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => {
                if (pendingTab) {
                  setActiveTab(pendingTab);
                  setHasUnsavedChanges(false);
                }
                setShowTabChangeDialog(false);
                setPendingTab(null);
              }}
              className="w-full sm:w-auto"
            >
              Esci senza Salvare
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};