import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterBoutForm } from './RegisterBoutForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Plus, Trophy } from 'lucide-react';

export const InstructorDashboard = () => {
  return (
    <main className="w-full px-6 py-8 pb-20 md:pb-8">
      <Tabs defaultValue="overview" className="space-y-6">
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
          <Card>
            <CardHeader>
              <CardTitle>Gestione Tournament</CardTitle>
              <CardDescription>
                Crea e gestisci tournament con matrice tutti-contro-tutti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-12">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Sistema Tournament</h3>
                <p>Funzionalità avanzata per la gestione di tournament completi</p>
                <p className="text-sm mt-2">Implementazione in corso...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};