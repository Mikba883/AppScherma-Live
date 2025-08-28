import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGym } from '@/hooks/useGym';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import GymSettings from '@/components/gym/GymSettings';
import InviteManager from '@/components/gym/InviteManager';
import { Settings, UserPlus, Users } from 'lucide-react';

const GymAdminPage = () => {
  const { gym, loading: gymLoading } = useGym();
  const { isGymOwner, loading: roleLoading } = useUserRole();

  if (gymLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isGymOwner) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Amministrazione Palestra</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci le impostazioni e gli inviti della tua palestra
        </p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Impostazioni
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Inviti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Palestra</CardTitle>
              <CardDescription>
                Modifica le informazioni e i turni della tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GymSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Inviti</CardTitle>
              <CardDescription>
                Invita atleti e istruttori nella tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GymAdminPage;