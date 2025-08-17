import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Play, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { TournamentAthlete } from '@/types/tournament';

interface TournamentSetupProps {
  onStartTournament: (athletes: TournamentAthlete[]) => void;
}

interface AthleteWithShift extends TournamentAthlete {
  shift?: string;
}

export const TournamentSetup = ({ onStartTournament }: TournamentSetupProps) => {
  const [athletes, setAthletes] = useState<AthleteWithShift[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, shift')
        .order('full_name');

      if (error) throw error;
      
      const athleteData = data.map(athlete => ({
        id: athlete.user_id,
        full_name: athlete.full_name,
        shift: athlete.shift
      }));

      setAthletes(athleteData);
      
      // Get unique shifts for filter
      const shifts = [...new Set(data.map(a => a.shift).filter(Boolean))];
      setAvailableShifts(shifts);
    } catch (error) {
      console.error('Error fetching athletes:', error);
      toast.error('Errore nel caricamento degli atleti');
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(athlete => {
    const isNotSelected = !selectedAthletes.some(selected => selected.id === athlete.id);
    const matchesShift = !shiftFilter || athlete.shift === shiftFilter;
    return isNotSelected && matchesShift;
  });

  const handleAddAthlete = (athleteId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete) {
      setSelectedAthletes(prev => [...prev, { id: athlete.id, full_name: athlete.full_name }]);
      setSelectedAthleteId('');
    }
  };

  const handleRemoveAthlete = (athleteId: string) => {
    setSelectedAthletes(prev => prev.filter(athlete => athlete.id !== athleteId));
  };

  const handleStartTournament = () => {
    if (selectedAthletes.length < 3) {
      toast.error('Seleziona almeno 3 atleti per iniziare un torneo');
      return;
    }

    if (selectedAthletes.length > 16) {
      toast.error('Seleziona massimo 16 atleti per il torneo');
      return;
    }

    onStartTournament(selectedAthletes);
  };

  const clearAll = () => {
    setSelectedAthletes([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento atleti...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Selezione Atleti per Torneo
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {selectedAthletes.length} atleti selezionati
            </Badge>
            {selectedAthletes.length > 0 && (
              <Badge variant="outline">
                {(selectedAthletes.length * (selectedAthletes.length - 1)) / 2} incontri totali
              </Badge>
            )}
          </div>
          {selectedAthletes.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll}>
              Deseleziona tutti
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters and Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shift Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <label className="text-sm font-medium">Filtra per turno</label>
            </div>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti i turni" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti i turni</SelectItem>
                {availableShifts.map((shift) => (
                  <SelectItem key={shift} value={shift}>
                    {shift}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Athlete Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Aggiungi atleta</label>
            <div className="flex gap-2">
              <Select 
                value={selectedAthleteId} 
                onValueChange={(value) => {
                  setSelectedAthleteId(value);
                  handleAddAthlete(value);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleziona un atleta..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAthletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.full_name} {athlete.shift && `(${athlete.shift})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Selected Athletes */}
        {selectedAthletes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Atleti selezionati:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleRemoveAthlete(athlete.id)}
                >
                  <span className="text-sm font-medium">{athlete.full_name}</span>
                  <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clicca su un atleta per rimuoverlo dalla selezione
            </p>
          </div>
        )}

        {/* Start Tournament Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleStartTournament}
            disabled={selectedAthletes.length < 3}
            size="lg"
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Inizia Torneo ({selectedAthletes.length} atleti)
          </Button>
        </div>

        {selectedAthletes.length < 3 && selectedAthletes.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Seleziona almeno 3 atleti per iniziare il torneo
          </p>
        )}
      </CardContent>
    </Card>
  );
};