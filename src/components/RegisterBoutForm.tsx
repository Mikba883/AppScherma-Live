import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface Athlete {
  user_id: string;
  full_name: string;
}

interface RegisterBoutFormProps {
  isInstructorMode?: boolean;
}

export const RegisterBoutForm = ({ isInstructorMode = false }: RegisterBoutFormProps) => {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    athleteA: isInstructorMode ? '' : user?.id || '',
    athleteB: '',
    boutDate: new Date().toISOString().split('T')[0],
    weapon: 'none',
    boutType: 'sparring',
    scoreA: '',
    scoreB: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchAthletes();
    }
  }, [user]);

  const fetchAthletes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'allievo')
        .order('full_name');

      if (error) throw error;
      
      // Se non siamo in modalità istruttore, filtra via l'utente corrente
      const filteredData = isInstructorMode 
        ? data || []
        : (data || []).filter(athlete => athlete.user_id !== user.id);
      
      setAthletes(filteredData);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation per modalità istruttore vs allievo
    if (isInstructorMode) {
      if (!formData.athleteA || !formData.athleteB || !formData.scoreA || !formData.scoreB) {
        toast({
          title: "Errore",
          description: "Seleziona entrambi gli atleti e inserisci i punteggi",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (!formData.athleteB || !formData.scoreA || !formData.scoreB) {
        toast({
          title: "Errore",
          description: "Tutti i campi obbligatori devono essere compilati",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isInstructorMode) {
        // Modalità istruttore: usa la nuova funzione RPC
        const { data, error } = await supabase.rpc('register_bout_instructor', {
          _athlete_a: formData.athleteA,
          _athlete_b: formData.athleteB,
          _bout_date: formData.boutDate,
          _weapon: formData.weapon === 'none' ? '' : formData.weapon,
          _bout_type: formData.boutType,
          _score_a: parseInt(formData.scoreA),
          _score_b: parseInt(formData.scoreB)
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
          description: "Match inserito direttamente nel sistema"
        });
      } else {
        // Modalità allievo: sistema di approvazione esistente
        const { data, error } = await supabase.rpc('register_bout', {
          _opponent: formData.athleteB,
          _bout_date: formData.boutDate,
          _weapon: formData.weapon === 'none' ? '' : formData.weapon,
          _bout_type: formData.boutType,
          _my_score: parseInt(formData.scoreA),
          _opp_score: parseInt(formData.scoreB)
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
      }

      // Reset form
        setFormData({
          athleteA: isInstructorMode ? '' : user?.id || '',
          athleteB: '',
          boutDate: new Date().toISOString().split('T')[0],
          weapon: 'none',
          boutType: 'sparring',
          scoreA: '',
          scoreB: '',
          notes: ''
        });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Errore registrazione",
        description: error.message || "Impossibile registrare il match. Controlla i permessi e riprova.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mobile-form">
      <div className="mobile-grid">
        {isInstructorMode && (
          <div className="space-y-2">
            <Label htmlFor="athleteA">Atleta A *</Label>
            <Combobox
              options={athletes.map((athlete) => ({
                value: athlete.user_id,
                label: athlete.full_name
              }))}
              value={formData.athleteA}
              onValueChange={(value) => setFormData(prev => ({ ...prev, athleteA: value }))}
              placeholder="Atleta A..."
              emptyText="Nessun atleta trovato."
              className="w-full"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="athleteB">{isInstructorMode ? 'Atleta B *' : 'Avversario *'}</Label>
          <Combobox
            options={athletes
              .filter(athlete => !isInstructorMode || athlete.user_id !== formData.athleteA)
              .map((athlete) => ({
                value: athlete.user_id,
                label: athlete.full_name
              }))}
            value={formData.athleteB}
            onValueChange={(value) => setFormData(prev => ({ ...prev, athleteB: value }))}
            placeholder={isInstructorMode ? "Atleta B..." : "Avversario..."}
            emptyText="Nessun atleta trovato."
            className="w-full"
          />
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
          <Label htmlFor="weapon">Arma</Label>
          <Select value={formData.weapon} onValueChange={(value) => setFormData(prev => ({ ...prev, weapon: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Arma..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuna arma specificata</SelectItem>
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
          <Label htmlFor="scoreA">
            {isInstructorMode ? 'Punteggio Atleta A *' : 'Il tuo punteggio *'}
          </Label>
          <Input
            id="scoreA"
            type="number"
            min="0"
            max="50"
            value={formData.scoreA}
            onChange={(e) => setFormData(prev => ({ ...prev, scoreA: e.target.value }))}
            placeholder="es. 15"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scoreB">
            {isInstructorMode ? 'Punteggio Atleta B *' : 'Punteggio avversario *'}
          </Label>
          <Input
            id="scoreB"
            type="number"
            min="0"
            max="50"
            value={formData.scoreB}
            onChange={(e) => setFormData(prev => ({ ...prev, scoreB: e.target.value }))}
            placeholder="es. 12"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note (opzionale)</Label>
          <Textarea
            id="notes"
            placeholder="Note..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="mobile-input"
          />
      </div>

      <Button type="submit" disabled={loading} className="w-full mobile-button">
        <Send className="h-4 w-4 mr-2" />
        {loading ? 'Invio...' : 'Registra'}
      </Button>

      {!isInstructorMode && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p>Match da approvare dall'avversario</p>
        </div>
      )}
      
      {isInstructorMode && (
        <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800/30">
          <p><strong>Modalità Istruttore:</strong> Il match verrà inserito direttamente nel sistema senza necessità di approvazione.</p>
        </div>
      )}
    </form>
  );
};