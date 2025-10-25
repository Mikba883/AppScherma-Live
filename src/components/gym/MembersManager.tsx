import { useState } from 'react';
import { useGymMembers } from '@/hooks/useGymMembers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';

export const MembersManager = () => {
  const { user } = useAuth();
  const { gym } = useGym();
  const { members, loading, updateMemberShift, removeMember } = useGymMembers();
  const [shiftChanges, setShiftChanges] = useState<Record<string, string | null>>({});
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const handleShiftChange = (userId: string, shift: string) => {
    setShiftChanges(prev => ({ ...prev, [userId]: shift }));
  };

  const handleSaveShift = async (userId: string) => {
    const newShift = shiftChanges[userId];
    if (newShift === undefined) return;

    const { error } = await updateMemberShift(userId, newShift);
    
    if (error) {
      toast.error('Errore durante l\'aggiornamento del turno');
      console.error(error);
    } else {
      toast.success('Turno aggiornato con successo');
      setShiftChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    const { error } = await removeMember(memberToRemove);
    
    if (error) {
      toast.error('Errore durante la rimozione del membro');
      console.error(error);
    } else {
      toast.success('Membro rimosso dalla palestra');
    }
    
    setMemberToRemove(null);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'capo_palestra') {
      return <Badge variant="destructive">Capo Palestra</Badge>;
    } else if (role === 'istruttore') {
      return <Badge variant="default">Istruttore</Badge>;
    } else {
      return <Badge variant="secondary">Allievo</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-4">Caricamento membri...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Età</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nessun membro trovato
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const currentShift = shiftChanges[member.user_id] ?? member.shift ?? '';
                const hasChanges = shiftChanges[member.user_id] !== undefined;

                return (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.full_name}
                      {isCurrentUser && <span className="ml-2 text-muted-foreground">(Tu)</span>}
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      {isCurrentUser ? (
                        <span>{member.shift || '-'}</span>
                      ) : (
                        <Select
                          value={currentShift}
                          onValueChange={(value) => handleShiftChange(member.user_id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Seleziona turno" />
                          </SelectTrigger>
                          <SelectContent>
                            {gym?.shifts?.map((shift) => (
                              <SelectItem key={shift} value={shift}>
                                {shift}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{calculateAge(member.birth_date)}</TableCell>
                    <TableCell>
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2">
                          {hasChanges && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveShift(member.user_id)}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Salva
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setMemberToRemove(member.user_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Rimozione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere questo membro dalla palestra? L'utente non potrà più accedere ai dati della palestra ma il suo account non verrà eliminato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
