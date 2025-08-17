import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, Play, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { TournamentAthlete } from '@/pages/TournamentPage';

interface TournamentSetupProps {
  onStartTournament: (athletes: TournamentAthlete[]) => void;
}

export const TournamentSetup = ({ onStartTournament }: TournamentSetupProps) => {
  const [athletes, setAthletes] = useState<TournamentAthlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');

      if (error) throw error;
      
      setAthletes(data.map(athlete => ({
        id: athlete.user_id,
        full_name: athlete.full_name
      })));
    } catch (error) {
      console.error('Error fetching athletes:', error);
      toast.error('Errore nel caricamento degli atleti');
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(athlete =>
    athlete.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAthleteToggle = (athleteId: string) => {
    setSelectedAthletes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(athleteId)) {
        newSet.delete(athleteId);
      } else {
        newSet.add(athleteId);
      }
      return newSet;
    });
  };

  const handleStartTournament = () => {
    const selectedAthletesList = athletes.filter(athlete => 
      selectedAthletes.has(athlete.id)
    );

    if (selectedAthletesList.length < 3) {
      toast.error('Seleziona almeno 3 atleti per iniziare un torneo');
      return;
    }

    if (selectedAthletesList.length > 16) {
      toast.error('Seleziona massimo 16 atleti per il torneo');
      return;
    }

    onStartTournament(selectedAthletesList);
  };

  const selectAll = () => {
    setSelectedAthletes(new Set(filteredAthletes.map(a => a.id)));
  };

  const clearAll = () => {
    setSelectedAthletes(new Set());
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
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Selezione Atleti per Torneo
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {selectedAthletes.size} atleti selezionati
              </Badge>
              {selectedAthletes.size > 0 && (
                <Badge variant="outline">
                  {(selectedAthletes.size * (selectedAthletes.size - 1)) / 2} incontri totali
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Seleziona tutti
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Deseleziona tutti
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca atleti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Athletes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredAthletes.map((athlete) => (
              <div
                key={athlete.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={athlete.id}
                  checked={selectedAthletes.has(athlete.id)}
                  onCheckedChange={() => handleAthleteToggle(athlete.id)}
                />
                <Label
                  htmlFor={athlete.id}
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {athlete.full_name}
                </Label>
              </div>
            ))}
          </div>

          {filteredAthletes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun atleta trovato con il termine di ricerca "{searchTerm}"
            </div>
          )}

          {/* Start Tournament Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleStartTournament}
              disabled={selectedAthletes.size < 3}
              size="lg"
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Inizia Torneo ({selectedAthletes.size} atleti)
            </Button>
          </div>

          {selectedAthletes.size < 3 && selectedAthletes.size > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Seleziona almeno 3 atleti per iniziare il torneo
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};