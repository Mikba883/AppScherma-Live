import { useState } from 'react';
import { useGymMembers } from '@/hooks/useGymMembers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';

export const MembersManager = () => {
  const { members, loading, updateMemberShift, removeMember } = useGymMembers();
  const { user } = useAuth();
  const { gym } = useGym();
  const { toast } = useToast();
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [shiftChanges, setShiftChanges] = useState<Record<string, string>>({});

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'capo_palestra':
        return 'destructive';
      case 'istruttore':
        return 'default';
      case 'allievo':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'capo_palestra':
        return 'Capo Palestra';
      case 'istruttore':
        return 'Istruttore';
      case 'allievo':
        return 'Allievo';
      default:
        return role;
    }
  };

  const handleShiftChange = (userId: string, newShift: string) => {
    setShiftChanges(prev => ({
      ...prev,
      [userId]: newShift
    }));
  };

  const handleSaveShift = async (userId: string) => {
    const newShift = shiftChanges[userId];
    if (!newShift) return;

    const { error } = await updateMemberShift(userId, newShift);
    
    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il turno',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Turno aggiornato',
        description: 'Il turno è stato modificato con successo',
      });
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
      toast({
        title: 'Errore',
        description: 'Impossibile rimuovere il membro dalla palestra',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Membro rimosso',
        description: 'Il membro è stato rimosso dalla palestra',
      });
    }
    
    setMemberToRemove(null);
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento membri...</div>;
  }

  if (!members.length) {
    return <div className="text-center py-8 text-muted-foreground">Nessun membro nella palestra</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Età</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const currentShift = shiftChanges[member.user_id] || member.shift || '';
              const hasShiftChange = shiftChanges[member.user_id] && shiftChanges[member.user_id] !== member.shift;

              return (
                <TableRow key={member.user_id}>
                  <TableCell className="font-medium">
                    {member.full_name}
                    {isCurrentUser && <span className="ml-2 text-muted-foreground">(Tu)</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isCurrentUser ? (
                      <span>{member.shift || 'Non specificato'}</span>
                    ) : (
                      <Select
                        value={currentShift}
                        onValueChange={(value) => handleShiftChange(member.user_id, value)}
                      >
                        <SelectTrigger className="w-32">
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
                  <TableCell>{calculateAge(member.birth_date)} anni</TableCell>
                  <TableCell className="text-right">
                    {!isCurrentUser && (
                      <div className="flex justify-end gap-2">
                        {hasShiftChange && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveShift(member.user_id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setMemberToRemove(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi membro dalla palestra</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere questo membro dalla palestra? 
              L'account non verrà cancellato, ma il membro non farà più parte della tua palestra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
