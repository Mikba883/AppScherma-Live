import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface Athlete {
  user_id: string;
  full_name: string;
}

export const RegisterBoutForm = () => {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    opponent: '',
    boutDate: new Date().toISOString().split('T')[0],
    weapon: '',
    boutType: 'sparring',
    myScore: '',
    oppScore: '',
    notes: ''
  });

  useEffect(() => {
    fetchAthletes();
  }, [user]);

  const fetchAthletes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .neq('user_id', user.id)
        .order('full_name');

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.opponent || !formData.weapon || !formData.myScore || !formData.oppScore) {
      toast({
        title: "Errore",
        description: "Tutti i campi obbligatori devono essere compilati",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('register_bout', {
        _opponent: formData.opponent,
        _bout_date: formData.boutDate,
        _weapon: formData.weapon,
        _bout_type: formData.boutType,
        _my_score: parseInt(formData.myScore),
        _opp_score: parseInt(formData.oppScore)
      });

      if (error) throw error;

      // Aggiorna le note se presenti
      if (formData.notes && data) {
        await supabase
          .from('bouts')
          .update({ notes: formData.notes })
          .eq('id', data);
      }

      toast({
        title: "Match registrato",
        description: "Il match è stato inviato per approvazione all'avversario"
      });

      // Reset form
      setFormData({
        opponent: '',
        boutDate: new Date().toISOString().split('T')[0],
        weapon: '',
        boutType: 'sparring',
        myScore: '',
        oppScore: '',
        notes: ''
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile registrare il match",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="opponent">Avversario *</Label>
          <Select value={formData.opponent} onValueChange={(value) => setFormData(prev => ({ ...prev, opponent: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona avversario" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((athlete) => (
                <SelectItem key={athlete.user_id} value={athlete.user_id}>
                  {athlete.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="boutDate">Data Match</Label>
          <Input
            id="boutDate"
            type="date"
            value={formData.boutDate}
            onChange={(e) => setFormData(prev => ({ ...prev, boutDate: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weapon">Arma *</Label>
          <Select value={formData.weapon} onValueChange={(value) => setFormData(prev => ({ ...prev, weapon: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona arma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fioretto">Fioretto</SelectItem>
              <SelectItem value="spada">Spada</SelectItem>
              <SelectItem value="sciabola">Sciabola</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="boutType">Tipo Match</Label>
          <Select value={formData.boutType} onValueChange={(value) => setFormData(prev => ({ ...prev, boutType: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sparring">Sparring</SelectItem>
              <SelectItem value="gara">Gara</SelectItem>
              <SelectItem value="bianco">Assalto Bianco</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="myScore">Il tuo punteggio *</Label>
          <Input
            id="myScore"
            type="number"
            min="0"
            max="50"
            value={formData.myScore}
            onChange={(e) => setFormData(prev => ({ ...prev, myScore: e.target.value }))}
            placeholder="es. 15"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="oppScore">Punteggio avversario *</Label>
          <Input
            id="oppScore"
            type="number"
            min="0"
            max="50"
            value={formData.oppScore}
            onChange={(e) => setFormData(prev => ({ ...prev, oppScore: e.target.value }))}
            placeholder="es. 12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note (opzionale)</Label>
        <Textarea
          id="notes"
          placeholder="Aggiungi eventuali note sul match..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        <Send className="h-4 w-4 mr-2" />
        {loading ? 'Registrazione...' : 'Registra Match'}
      </Button>

      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p><strong>Nota:</strong> Il match sarà inviato all'avversario per approvazione. Una volta approvato, verrà incluso nelle statistiche del team.</p>
      </div>
    </form>
  );
};