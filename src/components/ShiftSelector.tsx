import { useState } from 'react';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useGymQuery } from '@/hooks/useGymQuery';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Clock } from 'lucide-react';

interface ShiftSelectorProps {
  onSuccess?: () => void;
}

export const ShiftSelector = ({ onSuccess }: ShiftSelectorProps) => {
  const { profile, updateProfile } = useProfileQuery();
  const { gym } = useGymQuery();
  const [selectedShift, setSelectedShift] = useState<string>(profile?.shift || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedShift) {
      toast({
        title: "Errore",
        description: "Seleziona un turno",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await updateProfile({ shift: selectedShift });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il turno",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Successo",
        description: "Turno aggiornato con successo"
      });
      onSuccess?.();
    }
  };

  if (!gym?.shifts || gym.shifts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nessun turno configurato</p>
        <p className="text-sm mt-2">Contatta il capo palestra per configurare i turni</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="current-shift">Turno Attuale</Label>
        <div className="text-sm text-muted-foreground px-3 py-2 border rounded-md bg-muted/50">
          {profile?.shift || 'Nessun turno selezionato'}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift-select">Nuovo Turno</Label>
        <Select value={selectedShift} onValueChange={setSelectedShift}>
          <SelectTrigger id="shift-select">
            <SelectValue placeholder="Seleziona un turno" />
          </SelectTrigger>
          <SelectContent>
            {gym.shifts.map((shift) => (
              <SelectItem key={shift} value={shift}>
                {shift}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={handleSave} 
        className="w-full"
        disabled={isLoading || !selectedShift || selectedShift === profile?.shift}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salva Turno
      </Button>
    </div>
  );
};
