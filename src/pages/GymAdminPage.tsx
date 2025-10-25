import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGymQuery } from '@/hooks/useGymQuery';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { Navigate, useNavigate } from 'react-router-dom';
import { GymSettingsOptimized } from '@/components/gym/GymSettingsOptimized';
import InviteManager from '@/components/gym/InviteManager';
import { MembersManager } from '@/components/gym/MembersManager';
import { Settings, UserPlus, Users, AlertCircle, ArrowLeft, UsersRound } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

const GymAdminPage = () => {
  const { gym, loading: gymLoading, isOwner } = useGymQuery();
  const { profile, loading: profileLoading } = useProfileQuery();
  const navigate = useNavigate();

  if (gymLoading || profileLoading) {
    return <DashboardSkeleton />;
  }

  // Check if user has a gym
  if (!profile?.gym_id) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Non sei associato a nessuna palestra. Devi prima creare o unirti a una palestra.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if user is the owner
  if (!isOwner) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Solo il proprietario della palestra può accedere a questa pagina.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Amministrazione Palestra</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci le impostazioni e gli inviti della tua palestra
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <UsersRound className="h-4 w-4" />
            Membri
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Inviti
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Impostazioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Membri</CardTitle>
              <CardDescription>
                Visualizza e gestisci i membri della tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembersManager />
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

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Palestra</CardTitle>
              <CardDescription>
                Modifica le informazioni e i turni della tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GymSettingsOptimized />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GymAdminPage;
