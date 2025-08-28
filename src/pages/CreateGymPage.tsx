import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Plus, X } from 'lucide-react';

const CreateGymPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [shifts, setShifts] = useState<string[]>(['mattina', 'pomeriggio', 'sera']);
  const [newShift, setNewShift] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
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
    setLoading(true);

    try {
      let logoUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('gym-logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gym-logos')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      // Create gym using the database function
      const { data, error } = await supabase
        .rpc('create_gym', {
          _name: formData.name,
          _logo_url: logoUrl,
          _owner_name: formData.ownerName,
          _owner_email: formData.ownerEmail,
          _shifts: shifts
        });

      if (error) throw error;

      toast({
        title: 'Palestra creata con successo!',
        description: 'Ora sei il capo palestra della tua nuova palestra.',
      });

      // Reload to update user role and redirect
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error creating gym:', error);
      toast({
        title: 'Errore nella creazione della palestra',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Crea Nuova Palestra</CardTitle>
          <CardDescription>
            Compila i dati per creare una nuova palestra. Diventerai automaticamente il capo palestra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Palestra *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Es. Palestra Fanfulla Milano"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Nome Titolare *</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                required
                placeholder="Mario Rossi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email Titolare *</Label>
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
              <Label htmlFor="logo">Logo Palestra</Label>
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creazione...' : 'Crea Palestra'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateGymPage;