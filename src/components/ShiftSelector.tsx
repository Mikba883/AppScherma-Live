import { useState } from 'react';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useGymQuery } from '@/hooks/useGymQuery';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ShiftSelectorProps {
  onSuccess?: () => void;
}

export const ShiftSelector = ({ onSuccess }: ShiftSelectorProps) => {
  const { profile, updateProfile } = useProfileQuery();
  const { gym } = useGymQuery();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedShift, setSelectedShift] = useState<string>(profile?.shift || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINA') {
      toast({
        title: 'Conferma non valida',
        description: 'Devi digitare "ELIMINA" per confermare',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;

      toast({
        title: 'Account eliminato',
        description: 'Il tuo account è stato eliminato definitivamente',
      });

      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare l\'account. Riprova più tardi.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setConfirmText('');
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

      <Button
        variant="link"
        size="sm"
        className="text-xs text-destructive hover:text-destructive/80 px-0 h-auto w-full justify-center mt-2"
        onClick={() => setShowDeleteDialog(true)}
      >
        Elimina il mio account
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Questa azione eliminerà permanentemente il tuo account e rimuoverà tutti i tuoi dati dai nostri server.
              </p>
              <p className="font-semibold">
                Per confermare, digita <span className="text-destructive">ELIMINA</span> nel campo sottostante:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digita ELIMINA"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmText !== 'ELIMINA'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Elimina Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
