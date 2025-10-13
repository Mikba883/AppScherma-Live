import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Shield, Mail, Lock, User, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [shift, setShift] = useState('');
  const [parentalConsent, setParentalConsent] = useState(false);
  const [isMinor, setIsMinor] = useState(false);

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleBirthDateChange = (date: string) => {
    setBirthDate(date);
    const age = calculateAge(date);
    setIsMinor(age < 18);
    if (age >= 18) setParentalConsent(false);
  };

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { _token: token });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Invito non trovato",
          description: "Il link di invito non è valido o è scaduto.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      const invData = data[0];
      
      // Structure the data to match expected format
      setInvitation({
        id: invData.id,
        gym_id: invData.gym_id,
        role: invData.role,
        status: invData.status,
        expires_at: invData.expires_at,
        gyms: {
          id: invData.gym_id,
          name: invData.gym_name,
          logo_url: invData.gym_logo_url,
          shifts: invData.gym_shifts,
        },
      });
      
      // Email no longer exposed for security, user will provide it
      setEmail('');
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile verificare l'invito.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      toast({
        title: "Password troppo corta",
        description: "La password deve essere di almeno 6 caratteri.",
        variant: "destructive",
      });
      return;
    }

    if (isMinor && !parentalConsent) {
      toast({
        title: "Consenso obbligatorio",
        description: "Il consenso del genitore/tutore è obbligatorio per i minorenni",
        variant: "destructive",
      });
      return;
    }

    setAccepting(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            birth_date: birthDate,
            gender,
            role: invitation.role,
            shift,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('gym_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
      }

      toast({
        title: "Account creato con successo!",
        description: "Controlla la tua email per confermare l'account.",
      });

      // Redirect to auth page
      navigate('/auth');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare l'account.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const roleIcon = invitation.role === 'istruttore' ? <Shield className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />;
  const roleText = invitation.role === 'istruttore' ? 'Istruttore' : 'Allievo';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center">
            {invitation.gyms?.logo_url ? (
              <img 
                src={invitation.gyms.logo_url} 
                alt={invitation.gyms?.name} 
                className="h-16 w-16 object-contain"
              />
            ) : (
              <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            Unisciti a {invitation.gyms?.name}
          </CardTitle>
          <CardDescription className="text-center">
            Sei stato invitato come {roleIcon} <span className="font-semibold">{roleText}</span>
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleAccept}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-4 w-4 mr-1" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tua.email@esempio.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                <User className="inline h-4 w-4 mr-1" />
                Nome Completo
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Mario Rossi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                <Lock className="inline h-4 w-4 mr-1" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Almeno 6 caratteri"
                minLength={6}
              />
            </div>

            {invitation.role === 'allievo' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Data di Nascita
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => handleBirthDateChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Genere</Label>
                    <Select value={gender} onValueChange={(value: 'M' | 'F') => setGender(value)}>
                      <SelectTrigger id="gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Maschio</SelectItem>
                        <SelectItem value="F">Femmina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isMinor && (
                  <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/50">
                    <Checkbox
                      id="parentalConsent"
                      checked={parentalConsent}
                      onCheckedChange={(checked) => setParentalConsent(checked as boolean)}
                      required
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="parentalConsent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Consenso del genitore/tutore
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Dichiaro di avere il consenso del genitore o tutore legale per la registrazione
                      </p>
                    </div>
                  </div>
                )}

                {invitation.gyms?.shifts && invitation.gyms.shifts.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="shift">Turno</Label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger id="shift">
                        <SelectValue placeholder="Seleziona un turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {invitation.gyms.shifts.map((s: string) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="text-xs text-muted-foreground text-center mt-2">
              Registrandoti accetti i nostri{' '}
              <Link to="/legal" target="_blank" className="text-primary hover:underline">
                Termini e Condizioni
              </Link>
              {' '}e la{' '}
              <Link to="/legal" target="_blank" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Accetta Invito e Crea Account
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Annulla
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}