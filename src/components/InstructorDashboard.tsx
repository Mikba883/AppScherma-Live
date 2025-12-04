import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisterBoutForm } from './RegisterBoutForm';
import { TournamentSection } from './tournament/TournamentSection';
import { TeamMatchSection } from './team-match/TeamMatchSection';
import { Plus, Trophy, Users } from 'lucide-react';

export const InstructorDashboard = () => {
  console.log('InstructorDashboard - Component loaded');
  
  const [hasUnsavedMatches, setHasUnsavedMatches] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('register');
  
  const handleTabChange = (newTab: string) => {
    if ((currentTab === 'tournament' || currentTab === 'team') && hasUnsavedMatches) {
      setPendingTab(newTab);
      setShowExitDialog(true);
    } else {
      setCurrentTab(newTab);
    }
  };

  const confirmTabChange = () => {
    if (pendingTab) {
      setCurrentTab(pendingTab);
      setPendingTab(null);
    }
    setShowExitDialog(false);
  };

  const cancelTabChange = () => {
    setPendingTab(null);
    setShowExitDialog(false);
  };

  return (
    <main className="w-full px-6 py-8 pb-20 md:pb-8">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registra Match</span>
          </TabsTrigger>
          <TabsTrigger value="tournament" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Tournament</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Squadre 3v3</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registra Match per Atleti</CardTitle>
              <CardDescription>
                Inserisci i risultati di un match per qualsiasi coppia di atleti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterBoutForm isInstructorMode={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournament" className="space-y-6">
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mobile-banner dark:bg-blue-950/30 dark:border-blue-800/30">
            <h3 className="font-medium text-blue-800 text-sm mb-1 dark:text-blue-200">Modalità Istruttore</h3>
            <p className="text-blue-700 text-xs mobile-text dark:text-blue-300">
              I match vengono inseriti direttamente senza approvazione.
            </p>
          </div>
          <TournamentSection onTournamentStateChange={setHasUnsavedMatches} />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg mobile-banner dark:bg-green-950/30 dark:border-green-800/30">
            <h3 className="font-medium text-green-800 text-sm mb-1 dark:text-green-200">Incontro a Squadre (3 vs 3)</h3>
            <p className="text-green-700 text-xs mobile-text dark:text-green-300">
              Formato staffetta: 9 assalti con target finale 45 stoccate.
            </p>
          </div>
          <TeamMatchSection />
        </TabsContent>
      </Tabs>

      {/* Exit Tournament Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uscire dalla modalità torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler uscire dalla modalità torneo senza salvare gli assalti? Tutti i dati inseriti andranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmTabChange}>
              Sì, Esci
            </AlertDialogAction>
            <AlertDialogCancel onClick={cancelTabChange}>No</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};
