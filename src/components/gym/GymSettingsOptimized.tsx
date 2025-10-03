import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGymQuery } from '@/hooks/useGymQuery';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, X, Upload } from 'lucide-react';

export const GymSettingsOptimized = () => {
  const { gym, updateGym } = useGymQuery();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [shifts, setShifts] = useState<string[]>([]);
  const [newShift, setNewShift] = useState('');

  useEffect(() => {
    if (gym) {
      setName(gym.name);
      setOwnerName(gym.owner_name);
      setOwnerEmail(gym.owner_email);
      setShifts(gym.shifts || []);
      if (gym.logo_url) {
        setLogoPreview(gym.logo_url);
      }
    }
  }, [gym]);

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

  const removeShift = (shiftToRemove: string) => {
    setShifts(shifts.filter(shift => shift !== shiftToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym) return;

    setLoading(true);
    let logoUrl = gym.logo_url;

    try {
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${gym.id}.${fileExt}`;
        const filePath = `gym-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gym-logos')
          .upload(filePath, logoFile, {
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gym-logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      const { error } = await updateGym({
        name,
        owner_name: ownerName,
        owner_email: ownerEmail,
        logo_url: logoUrl,
        shifts
      });

      if (error) throw error;

      toast({
        title: "Impostazioni aggiornate",
        description: "Le impostazioni della palestra sono state aggiornate con successo.",
      });
    } catch (error) {
      console.error('Error updating gym:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento delle impostazioni.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!gym) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Caricamento impostazioni palestra...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni Palestra</CardTitle>
        <CardDescription>
          Gestisci le informazioni della tua palestra
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Palestra</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Nome Proprietario</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Email Proprietario</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
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
                className="flex-1"
              />
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 w-16 object-contain rounded"
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
                placeholder="Aggiungi un turno"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addShift();
                  }
                }}
              />
              <Button type="button" onClick={addShift} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {shifts.map((shift) => (
                <div
                  key={shift}
                  className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md"
                >
                  <span>{shift}</span>
                  <button
                    type="button"
                    onClick={() => removeShift(shift)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva Impostazioni'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};