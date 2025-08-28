import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PublicLink {
  id: string;
  gym_id: string;
  is_active: boolean;
  uses_count: number;
  max_uses: number | null;
}

interface Gym {
  id: string;
  name: string;
  logo_url: string | null;
  owner_name: string;
}

const JoinGymPublic = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publicLink, setPublicLink] = useState<PublicLink | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'X'>('M');
  const [shift, setShift] = useState('');

  useEffect(() => {
    fetchPublicLink();
  }, [token]);

  const fetchPublicLink = async () => {
    if (!token) {
      navigate('/');
      return;
    }

    try {
      // Fetch public link
      const { data: linkData, error: linkError } = await supabase
        .from('gym_public_links')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (linkError || !linkData) {
        toast({
          title: 'Link non valido',
          description: 'Il link di iscrizione non è valido o è scaduto.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      // Check if max uses exceeded
      if (linkData.max_uses && linkData.uses_count >= linkData.max_uses) {
        toast({
          title: 'Link esaurito',
          description: 'Questo link ha raggiunto il numero massimo di utilizzi.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setPublicLink(linkData);

      // Fetch gym details
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .select('id, name, logo_url, owner_name')
        .eq('id', linkData.gym_id)
        .single();

      if (gymError || !gymData) {
        toast({
          title: 'Errore',
          description: 'Impossibile trovare la palestra.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setGym(gymData);
    } catch (error) {
      console.error('Error fetching public link:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il caricamento.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicLink || !gym) return;

    // Validate password
    if (password.length < 6) {
      toast({
        title: 'Password troppo corta',
        description: 'La password deve essere di almeno 6 caratteri.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            birth_date: birthDate,
            gender,
            role: 'allievo',
            shift,
            gym_id: gym.id,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast({
            title: 'Email già registrata',
            description: 'Questa email è già associata a un account. Prova ad accedere.',
            variant: 'destructive',
          });
        } else {
          throw authError;
        }
        return;
      }

      // Update the uses count
      await supabase
        .from('gym_public_links')
        .update({ uses_count: publicLink.uses_count + 1 })
        .eq('id', publicLink.id);

      toast({
        title: 'Registrazione completata!',
        description: 'Account creato con successo. Controlla la tua email per verificare l\'account.',
      });

      // Redirect to auth page
      navigate('/auth');
    } catch (error: any) {
      console.error('Error during signup:', error);
      toast({
        title: 'Errore durante la registrazione',
        description: error.message || 'Si è verificato un errore durante la registrazione.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!publicLink || !gym) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {gym.logo_url && (
            <img 
              src={gym.logo_url} 
              alt={`Logo ${gym.name}`}
              className="w-20 h-20 mx-auto mb-4 object-contain"
            />
          )}
          <CardTitle className="text-2xl">Unisciti a {gym.name}</CardTitle>
          <CardDescription>
            Registrati come allievo e inizia il tuo percorso di scherma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="La tua email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Scegli una password sicura"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nome e cognome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data di nascita</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Genere</Label>
              <Select value={gender} onValueChange={(value: 'M' | 'F' | 'X') => setGender(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona genere" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Maschio</SelectItem>
                  <SelectItem value="F">Femmina</SelectItem>
                  <SelectItem value="X">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift">Turno (opzionale)</Label>
              <Input
                id="shift"
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder="Es: Martedì e Giovedì 19:00"
              />
            </div>

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Ti stai registrando come <strong>allievo</strong> presso {gym.name}.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrazione...
                  </>
                ) : (
                  'Crea Account'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/auth')}
                disabled={submitting}
              >
                Ho già un account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGymPublic;