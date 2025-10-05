import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Shield } from 'lucide-react';

const ChangePasswordPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetFlow, setIsResetFlow] = useState(false);

  // Check if this is a password reset flow from email
  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    
    // Always assume reset flow if we have any recovery indicators
    // This simplifies UX by never asking for old password during reset
    if (type === 'recovery' || accessToken || window.location.hash.includes('type=recovery')) {
      setIsResetFlow(true);
      console.log('Password reset flow detected');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Errore",
        description: "Le nuove password non coincidono",
        variant: "destructive"
      });
      return;
    }

    if (passwords.new.length < 6) {
      toast({
        title: "Errore", 
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isResetFlow) {
        // Password reset flow - no current password needed
        const { error } = await supabase.auth.updateUser({
          password: passwords.new
        });

        if (error) throw error;

        toast({
          title: "Successo",
          description: "Password aggiornata con successo"
        });

        // Clear URL parameters and redirect
        window.location.href = '/';
      } else {
        // Regular password change - verify current password first
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: passwords.current
        });

        if (signInError) {
          toast({
            title: "Errore",
            description: "Password attuale non corretta",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: passwords.new
        });

        if (error) throw error;

        toast({
          title: "Successo",
          description: "Password cambiata con successo"
        });

        navigate('/');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento della password",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not logged in and not in reset flow
  if (!user && !isResetFlow) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                {isResetFlow ? (
                  <Shield className="h-6 w-6 text-primary" />
                ) : (
                  <Lock className="h-6 w-6 text-primary" />
                )}
              </div>
              <CardTitle>
                {isResetFlow ? 'Imposta Nuova Password' : 'Cambia Password'}
              </CardTitle>
              <CardDescription>
                {isResetFlow 
                  ? 'Inserisci la tua nuova password per completare il reset'
                  : 'Aggiorna la tua password per mantenere il tuo account sicuro'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isResetFlow && (
                  <div className="space-y-2">
                    <Label htmlFor="current">Password Attuale</Label>
                    <Input
                      id="current"
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                      required
                      placeholder="Inserisci la password attuale"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new">Nuova Password</Label>
                  <Input
                    id="new"
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                    required
                    minLength={6}
                    placeholder="Inserisci la nuova password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Almeno 6 caratteri
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Conferma Nuova Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                    required
                    minLength={6}
                    placeholder="Conferma la nuova password"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isResetFlow ? 'Impostando...' : 'Cambiando...'}
                    </>
                  ) : (
                    isResetFlow ? 'Imposta Password' : 'Cambia Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;