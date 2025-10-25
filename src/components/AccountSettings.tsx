import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const AccountSettings = () => {
  const { profile, updateProfile } = useProfile();
  const { signOut } = useAuth();
  const { gym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedShift, setSelectedShift] = useState(profile?.shift || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleShiftChange = async () => {
    const { error } = await updateProfile({ shift: selectedShift });
    
    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il turno',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Turno aggiornato',
        description: 'Il tuo turno è stato modificato con successo',
      });
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

      // Sign out and redirect
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
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cambia Turno</CardTitle>
          <CardDescription>
            Modifica il tuo turno di allenamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Turno attuale: {profile?.shift || 'Non specificato'}</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un turno" />
              </SelectTrigger>
              <SelectContent>
                {gym?.shifts?.map((shift) => (
                  <SelectItem key={shift} value={shift}>
                    {shift}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleShiftChange}
            disabled={selectedShift === profile?.shift}
          >
            Salva Turno
          </Button>
          <Button
            variant="link"
            size="sm"
            className="text-xs text-destructive hover:text-destructive/80 px-0 h-auto mt-4"
            onClick={() => setShowDeleteDialog(true)}
          >
            Elimina il mio account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Questa azione eliminerà definitivamente il tuo account e tutti i dati associati.
                Questa operazione è irreversibile.
              </p>
              <div className="space-y-2">
                <Label>Digita "ELIMINA" per confermare:</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ELIMINA"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'ELIMINA' || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
