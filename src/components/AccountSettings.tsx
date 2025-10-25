import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { useGym } from '@/hooks/useGym';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountSettings = () => {
  const { profile, updateProfile } = useProfile();
  const { gym } = useGym();
  const navigate = useNavigate();
  const [selectedShift, setSelectedShift] = useState(profile?.shift || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleShiftUpdate = async () => {
    const { error } = await updateProfile({ shift: selectedShift });
    
    if (error) {
      toast.error('Errore durante l\'aggiornamento del turno');
      console.error(error);
    } else {
      toast.success('Turno aggiornato con successo');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'ELIMINA') {
      toast.error('Conferma non corretta');
      return;
    }

    setIsDeleting(true);
    
    try {
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;

      toast.success('Account eliminato con successo');
      
      // Redirect to landing page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Errore durante l\'eliminazione dell\'account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shift Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Turno</CardTitle>
          <CardDescription>
            Modifica il turno in cui alleni abitualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shift">Seleziona Turno</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger id="shift">
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
          <Button onClick={handleShiftUpdate} disabled={selectedShift === profile?.shift}>
            <Save className="w-4 h-4 mr-2" />
            Salva Turno
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona Pericolosa</CardTitle>
          <CardDescription>
            Azioni irreversibili sul tuo account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              L'eliminazione del tuo account è <strong>permanente e irreversibile</strong>. 
              Tutti i tuoi dati personali verranno eliminati definitivamente.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Questa azione è <strong>irreversibile</strong>. Eliminerà permanentemente il tuo account 
                e tutti i dati associati.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm">
                  Digita <strong>ELIMINA</strong> per confermare:
                </Label>
                <Input
                  id="confirm"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="ELIMINA"
                  disabled={isDeleting}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'ELIMINA' || isDeleting}
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
