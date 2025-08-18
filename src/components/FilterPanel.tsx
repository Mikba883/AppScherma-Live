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

interface WeaponOption {
  value: string;
  label: string;
}

interface MatchTypeOption {
  value: string;
  label: string;
}

interface TurnOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  isInstructor?: boolean;
}

export const FilterPanel = ({ filters, onFiltersChange, isInstructor = true }: FilterPanelProps) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [availableWeapons, setAvailableWeapons] = useState<WeaponOption[]>([]);
  const [availableMatchTypes, setAvailableMatchTypes] = useState<MatchTypeOption[]>([]);
  const [availableTurns, setAvailableTurns] = useState<TurnOption[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(filters.athletes || []);
  const [isAthleteDropdownOpen, setIsAthleteDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAthletes();
    fetchAvailableOptions();
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

  const fetchAvailableOptions = async () => {
    try {
      // Fetch available weapons from bouts table
      const { data: weaponData, error: weaponError } = await supabase
        .from('bouts')
        .select('weapon')
        .not('weapon', 'is', null)
        .neq('weapon', '') // Exclude empty strings
        .order('weapon');

      if (!weaponError && weaponData) {
        const uniqueWeapons = [...new Set(weaponData.map(b => b.weapon).filter(w => w && w.trim() !== ''))];
        setAvailableWeapons(uniqueWeapons.map(w => ({
          value: w,
          label: w === 'fioretto' ? 'Fioretto' : w === 'spada' ? 'Spada' : 'Sciabola'
        })));
      }

      // Fetch available match types from bouts table
      const { data: typeData, error: typeError } = await supabase
        .from('bouts')
        .select('bout_type')
        .neq('bout_type', '') // Exclude empty strings
        .order('bout_type');

      if (!typeError && typeData) {
        const uniqueTypes = [...new Set(typeData.map(b => b.bout_type).filter(t => t && t.trim() !== ''))];
        setAvailableMatchTypes(uniqueTypes.map(t => ({
          value: t,
          label: t === 'sparring' ? 'Sparring' : t === 'gara' ? 'Gara' : 'Bianco'
        })));
      }

      // Fetch available turns from profiles table
      const { data: turnData, error: turnError } = await supabase
        .from('profiles')
        .select('shift')
        .not('shift', 'is', null)
        .neq('shift', '') // Exclude empty strings
        .order('shift');

      if (!turnError && turnData) {
        const uniqueTurns = [...new Set(turnData.map(p => p.shift).filter(s => s && s.trim() !== ''))];
        setAvailableTurns(uniqueTurns.map(t => ({
          value: t,
          label: `Turno ${t}`
        })));
      }
    } catch (error) {
      console.error('Error fetching available options:', error);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    // If value is empty string, convert to undefined to clear the filter
    const finalValue = value === '' ? undefined : value;
    const newFilters = { ...filters, [key]: finalValue };
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
          <Label htmlFor="dateFrom">Data da <span className="text-muted-foreground text-sm">(giorno/mese/anno)</span></Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => {
              const newFromDate = e.target.value || undefined;
              console.log('🗓️ FilterPanel - From date input:', newFromDate);
              handleFilterChange('dateFrom', newFromDate);
            }}
            lang="it-IT"
            style={{ 
              colorScheme: 'light',
              direction: 'ltr'
            }}
          />
          {filters.dateFrom && (
            <p className="text-xs text-green-600">
              Data attiva: {filters.dateFrom.split('-').reverse().join('/')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Data a <span className="text-muted-foreground text-sm">(giorno/mese/anno)</span></Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo || ''}
            min={filters.dateFrom || undefined}
            onChange={(e) => {
              const newToDate = e.target.value || undefined;
              console.log('🗓️ FilterPanel - To date input:', newToDate);
              handleFilterChange('dateTo', newToDate);
            }}
            lang="it-IT"
            style={{ 
              colorScheme: 'light',
              direction: 'ltr'
            }}
          />
          {filters.dateTo && (
            <p className="text-xs text-green-600">
              Data attiva: {filters.dateTo.split('-').reverse().join('/')}
            </p>
          )}
          {filters.dateFrom && filters.dateTo && new Date(filters.dateTo) < new Date(filters.dateFrom) && (
            <p className="text-sm text-destructive">
              La data "A" deve essere successiva alla data "Da"
            </p>
          )}
        </div>

        {isInstructor && (
          <div className="space-y-2">
            <Label htmlFor="gender">Genere</Label>
            <Select value={filters.gender || 'all'} onValueChange={(value) => handleFilterChange('gender', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti i generi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i generi</SelectItem>
                <SelectItem value="M">Maschio</SelectItem>
                <SelectItem value="F">Femmina</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="weapon">Arma</Label>
          <Select value={filters.weapon || 'all'} onValueChange={(value) => handleFilterChange('weapon', value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le armi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le armi</SelectItem>
              {availableWeapons.map((weapon) => (
                <SelectItem key={weapon.value} value={weapon.value}>
                  {weapon.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoMatch">Tipo Match</Label>
          <Select value={filters.tipoMatch || 'all'} onValueChange={(value) => handleFilterChange('tipoMatch', value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              {availableMatchTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isInstructor && (
          <div className="space-y-2">
            <Label htmlFor="turni">Turni</Label>
            <Select value={filters.turni || 'all'} onValueChange={(value) => handleFilterChange('turni', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti i turni" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i turni</SelectItem>
                {availableTurns.map((turn) => (
                  <SelectItem key={turn.value} value={turn.value}>
                    {turn.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isInstructor && (
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
      )}

      <div className="space-y-3">
        <Label>Atleti</Label>
        <Select value={selectedAthletes.length > 0 ? "selected" : "none"} onValueChange={() => {}}>
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