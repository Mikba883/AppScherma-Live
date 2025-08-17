import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RegisterBoutForm } from './RegisterBoutForm';
import { TournamentSection } from './tournament/TournamentSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Plus, Trophy } from 'lucide-react';

export const InstructorDashboard = () => {
  console.log('InstructorDashboard - Component loaded');
  
  const [hasUnsavedMatches, setHasUnsavedMatches] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');
  
  const handleTabChange = (newTab: string) => {
    if (currentTab === 'tournament' && hasUnsavedMatches) {
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
          <TabsTrigger value="overview" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Statistiche</span>
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registra Match</span>
          </TabsTrigger>
          <TabsTrigger value="tournament" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Tournament</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Atleti Totali</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Nel team</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Atleti Attivi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Ultimo mese</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Match Totali</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Tutti i tempi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Match Mese</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Ultimo mese</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Panoramica Team</CardTitle>
              <CardDescription>
                Statistiche globali e analisi del team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Implementazione statistiche globali in corso...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
          <TournamentSection onTournamentStateChange={setHasUnsavedMatches} />
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