import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { InstallPrompt } from '@/components/InstallPrompt';

const AuthPage = () => {
  const { user, signIn, signUp, loading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    birthDate: '',
    gender: '',
    role: '',
    shift: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!formData.fullName || !formData.birthDate || !formData.gender || !formData.role) {
          toast({
            title: "Errore",
            description: "Nome, data di nascita, genere e ruolo sono obbligatori",
            variant: "destructive"
          });
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.birthDate,
          formData.gender,
          formData.role,
          formData.shift
        );

        if (error) {
          toast({
            title: "Errore di registrazione",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Registrazione completata",
            description: "Controlla la tua email per confermare l'account"
          });
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          toast({
            title: "Errore di accesso",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore inaspettato",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <InstallPrompt alwaysShow />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://topkzcumjilaxbprufyo.supabase.co/storage/v1/object/public/gym-logos/ChatGPT%20Image%2028%20ago%202025,%2007_37_57.png" 
              alt="En Garde Logo" 
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            En Garde
          </CardTitle>
          <CardDescription>
            {isSignUp ? 'Crea il tuo account' : 'Accedi al tuo account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="mario.rossi@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Mario Rossi"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data di Nascita</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    required
                  />
                </div>

                 <div className="space-y-2">
                  <Label htmlFor="gender">Genere</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Seleziona genere" />
                    </SelectTrigger>
                    <SelectContent className="min-w-full">
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Ruolo</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Seleziona ruolo" />
                    </SelectTrigger>
                    <SelectContent className="min-w-full">
                      <SelectItem value="allievo">Allievo</SelectItem>
                      <SelectItem value="istruttore">Istruttore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift">Turno (opzionale)</Label>
                  <Select value={formData.shift} onValueChange={(value) => setFormData(prev => ({ ...prev, shift: value }))}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Seleziona turno (opzionale)" />
                    </SelectTrigger>
                    <SelectContent className="min-w-full">
                      <SelectItem value="mattina">Mattina</SelectItem>
                      <SelectItem value="pomeriggio">Pomeriggio</SelectItem>
                      <SelectItem value="sera">Sera</SelectItem>
                      <SelectItem value="infrasettimanale">Infrasettimanale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {isSignUp ? (
              <Button
                variant="link"
                onClick={() => setIsSignUp(false)}
                className="text-sm"
              >
                Hai già un account? Accedi
              </Button>
            ) : (
              <>
                <Button
                  variant="link"
                  onClick={() => navigate('/')}
                  className="text-sm"
                >
                  Torna alla Home
                </Button>
                
                <div>
                  <Button
                    variant="link"
                    onClick={async () => {
                      if (!formData.email) {
                        toast({
                          title: "Inserisci email",
                          description: "Inserisci la tua email per il reset password",
                          variant: "destructive"
                        });
                        return;
                      }

                      setIsResetting(true);
                      const { error } = await resetPassword(formData.email);
                      setIsResetting(false);

                      if (error) {
                        toast({
                          title: "Errore",
                          description: "Errore durante l'invio dell'email di reset",
                          variant: "destructive"
                        });
                      } else {
                        toast({
                          title: "Email inviata",
                          description: "Controlla la tua email per le istruzioni di reset password"
                        });
                      }
                    }}
                    className="text-xs text-muted-foreground"
                    disabled={isResetting}
                  >
                    {isResetting ? "Invio..." : "Password dimenticata?"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;