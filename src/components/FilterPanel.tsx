import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Filter } from 'lucide-react';
import { Filters } from '@/pages/ConsultationPage';

interface Athlete {
  user_id: string;
  full_name: string;
}

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const FilterPanel = ({ filters, onFiltersChange }: FilterPanelProps) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(filters.athletes || []);
  const [isAthleteDropdownOpen, setIsAthleteDropdownOpen] = useState(false);

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
      setAthletes(data || []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const handleAthleteToggle = (athleteId: string) => {
    const newSelected = selectedAthletes.includes(athleteId)
      ? selectedAthletes.filter(id => id !== athleteId)
      : [...selectedAthletes, athleteId];
    
    setSelectedAthletes(newSelected);
    handleFilterChange('athletes', newSelected.length > 0 ? newSelected : undefined);
  };

  const clearFilters = () => {
    setSelectedAthletes([]);
    onFiltersChange({});
  };

  const getSelectedAthleteNames = () => {
    return athletes
      .filter(a => selectedAthletes.includes(a.user_id))
      .map(a => a.full_name);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">Data da</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Data a</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Genere</Label>
          <Select value={filters.gender || ''} onValueChange={(value) => handleFilterChange('gender', value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i generi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Maschio</SelectItem>
              <SelectItem value="F">Femmina</SelectItem>
              <SelectItem value="X">Altro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weapon">Arma</Label>
          <Select value={filters.weapon || ''} onValueChange={(value) => handleFilterChange('weapon', value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le armi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fioretto">Fioretto</SelectItem>
              <SelectItem value="spada">Spada</SelectItem>
              <SelectItem value="sciabola">Sciabola</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="turno">Turno</Label>
          <Select value={filters.turno || ''} onValueChange={(value) => handleFilterChange('turno', value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i turni" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sparring">Sparring</SelectItem>
              <SelectItem value="match">Match</SelectItem>
              <SelectItem value="torneo">Torneo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minAge">Età minima</Label>
          <Input
            id="minAge"
            type="number"
            min="0"
            max="100"
            value={filters.minAge || ''}
            onChange={(e) => handleFilterChange('minAge', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="es. 18"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxAge">Età massima</Label>
          <Input
            id="maxAge"
            type="number"
            min="0"
            max="100"
            value={filters.maxAge || ''}
            onChange={(e) => handleFilterChange('maxAge', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="es. 30"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Atleti</Label>
        <Select value="" onValueChange={() => {}}>
          <SelectTrigger 
            onClick={() => setIsAthleteDropdownOpen(!isAthleteDropdownOpen)}
            className="min-h-10"
          >
            <SelectValue placeholder={selectedAthletes.length > 0 ? `${selectedAthletes.length} atleti selezionati` : "Seleziona atleti"} />
          </SelectTrigger>
          <SelectContent 
            className="w-[var(--radix-select-trigger-width)] max-w-none"
            position="popper"
            sideOffset={4}
          >
            <div className="max-h-60 overflow-y-auto">
              {athletes.map((athlete) => (
                <div key={athlete.user_id} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent">
                  <Checkbox
                    id={athlete.user_id}
                    checked={selectedAthletes.includes(athlete.user_id)}
                    onCheckedChange={() => handleAthleteToggle(athlete.user_id)}
                  />
                  <Label htmlFor={athlete.user_id} className="text-sm font-normal cursor-pointer flex-1">
                    {athlete.full_name}
                  </Label>
                </div>
              ))}
            </div>
          </SelectContent>
        </Select>
        
        {selectedAthletes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {getSelectedAthleteNames().map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Pulisci filtri
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtri attivi: {Object.values(filters).filter(v => v !== undefined && v !== '').length}
        </div>
      </div>
    </div>
  );
};