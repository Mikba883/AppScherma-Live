import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useGym } from '@/hooks/useGym';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Send, Check, X, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Invitation {
  id: string;
  email: string;
  role: 'allievo' | 'istruttore';
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

const InviteManager = () => {
  const { gym } = useGym();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    role: 'allievo' as 'allievo' | 'istruttore',
  });

  useEffect(() => {
    if (gym) {
      fetchInvitations();
    }
  }, [gym]);

  const fetchInvitations = async () => {
    if (!gym) return;

    try {
      const { data, error } = await supabase
        .from('gym_invitations')
        .select('*')
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as Invitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym) return;
    
    setLoading(true);

    try {
      // Generate unique token
      const token = `${gym.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create invitation
      const { error } = await supabase
        .from('gym_invitations')
        .insert({
          gym_id: gym.id,
          email: formData.email,
          role: formData.role,
          token: token,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      // Send invitation email
      const inviteUrl = `${window.location.origin}/accept-invitation/${token}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: formData.email,
          gymName: gym.name,
          inviterName: profile?.full_name || 'Il capo palestra',
          inviteLink: inviteUrl,
          role: formData.role,
        },
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        toast({
          title: 'Invito creato',
          description: `L'invito è stato creato ma l'email non è stata inviata. Link: ${inviteUrl}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Invito inviato!',
          description: `Un invito è stato inviato a ${formData.email}`,
        });
      }

      // Reset form
      setFormData({ email: '', role: 'allievo' });
      
      // Refresh invitations
      await fetchInvitations();
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: 'Errore nella creazione dell\'invito',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <Check className="h-3 w-3 mr-1" />
          Accettato
        </Badge>
      );
    } else if (isExpired || status === 'expired') {
      return (
        <Badge className="bg-red-100 text-red-800">
          <X className="h-3 w-3 mr-1" />
          Scaduto
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          In attesa
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email dell'invitato</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="esempio@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label>Ruolo</Label>
          <RadioGroup
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as 'allievo' | 'istruttore' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="allievo" id="allievo" />
              <Label htmlFor="allievo">Allievo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="istruttore" id="istruttore" />
              <Label htmlFor="istruttore">Istruttore</Label>
            </div>
          </RadioGroup>
        </div>

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Invio...' : 'Invia Invito'}
        </Button>
      </form>

      {invitations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Inviti Inviati</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Invio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell className="capitalize">{invitation.role}</TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.created_at).toLocaleDateString('it-IT')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteManager;