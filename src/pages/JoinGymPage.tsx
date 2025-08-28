import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, UserCheck, AlertCircle } from 'lucide-react';

interface Invitation {
  id: string;
  gym_id: string;
  email: string;
  role: 'allievo' | 'istruttore';
  status: string;
  expires_at: string;
  gym: {
    name: string;
    logo_url: string | null;
  };
}

const JoinGymPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('gym_invitations')
        .select(`
          *,
          gym:gyms(name, logo_url)
        `)
        .eq('token', token)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Invito non trovato');
        return;
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Questo invito è scaduto');
        return;
      }

      if (data.status === 'accepted') {
        setError('Questo invito è già stato utilizzato');
        return;
      }

      setInvitation(data as any);
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Errore nel recupero dell\'invito');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!invitation) return;

    setAccepting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to auth with the token
        navigate(`/auth?invitation=${token}`);
        return;
      }

      // Update user profile with gym_id and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gym_id: invitation.gym_id,
          role: invitation.role
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from('gym_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (inviteError) throw inviteError;

      toast({
        title: 'Invito accettato!',
        description: `Ora fai parte della palestra ${invitation.gym.name}`,
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Errore nell\'accettare l\'invito',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Invito non valido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {invitation.gym.logo_url && (
            <img
              src={invitation.gym.logo_url}
              alt={invitation.gym.name}
              className="h-20 w-20 object-contain mx-auto mb-4"
            />
          )}
          <CardTitle className="text-2xl">Invito alla Palestra</CardTitle>
          <CardDescription>
            Sei stato invitato a unirti a <strong>{invitation.gym.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Palestra:</strong> {invitation.gym.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Ruolo:</strong> {invitation.role === 'istruttore' ? 'Istruttore' : 'Allievo'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={acceptInvitation}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? 'Accettazione in corso...' : 'Accetta Invito'}
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Annulla
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            L'invito scadrà il {new Date(invitation.expires_at).toLocaleDateString('it-IT')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGymPage;