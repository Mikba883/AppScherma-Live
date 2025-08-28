import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Plus, X, Eye, EyeOff } from 'lucide-react';

const CreateGymPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [shifts, setShifts] = useState<string[]>(['mattina', 'pomeriggio', 'sera']);
  const [newShift, setNewShift] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    gymName: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addShift = () => {
    if (newShift && !shifts.includes(newShift)) {
      setShifts([...shifts, newShift]);
      setNewShift('');
    }
  };

  const removeShift = (shift: string) => {
    setShifts(shifts.filter(s => s !== shift));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Errore',
        description: 'Le password non coincidono',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Errore',
        description: 'La password deve essere di almeno 6 caratteri',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let logoUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('gym-logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gym-logos')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      // Create gym and user using the new function
      const { data, error } = await supabase
        .rpc('create_gym_and_user', {
          _email: formData.ownerEmail,
          _password: formData.password,
          _full_name: formData.ownerName,
          _gym_name: formData.gymName,
          _gym_logo_url: logoUrl,
          _shifts: shifts
        });

      if (error) throw error;

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.ownerEmail,
        password: formData.password,
      });

      if (signInError) throw signInError;

      toast({
        title: 'Palestra creata con successo!',
        description: 'Benvenuto in En Garde! Ora sei il capo palestra.',
      });

      // Redirect to dashboard
      navigate('/');
    } catch (error: any) {
      console.error('Error creating gym:', error);
      toast({
        title: 'Errore nella creazione',
        description: error.message || 'Si è verificato un errore durante la creazione della palestra',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <img 
            src="/en-garde-logo.png" 
            alt="En Garde Logo" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <CardTitle className="text-2xl">Crea la tua Palestra</CardTitle>
          <CardDescription>
            Registrati e crea la tua palestra di scherma su En Garde
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Gym Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informazioni Palestra</h3>
              
              <div className="space-y-2">
                <Label htmlFor="gymName">Nome Palestra *</Label>
                <Input
                  id="gymName"
                  value={formData.gymName}
                  onChange={(e) => setFormData({ ...formData, gymName: e.target.value })}
                  required
                  placeholder="Es. Circolo Scherma Milano"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo Palestra (opzionale)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="logo"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent"
                  >
                    <Upload className="h-4 w-4" />
                    Carica Logo
                  </Label>
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-12 w-12 object-contain rounded"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Turni</Label>
                <div className="flex gap-2">
                  <Input
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    placeholder="Aggiungi turno"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addShift();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addShift}
                    disabled={!newShift}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {shifts.map((shift) => (
                    <div
                      key={shift}
                      className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-full"
                    >
                      <span className="text-sm">{shift}</span>
                      <button
                        type="button"
                        onClick={() => removeShift(shift)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Informazioni Titolare</h3>
              
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nome Completo *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                  placeholder="Mario Rossi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  required
                  placeholder="mario.rossi@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Almeno 6 caratteri"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  placeholder="Ripeti la password"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/auth')}
                disabled={loading}
              >
                Ho già un account
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creazione in corso...' : 'Crea Palestra e Registrati'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateGymPage;