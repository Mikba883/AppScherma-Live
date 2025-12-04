import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Users, Swords, Play } from 'lucide-react';
import { TeamSetup, TEAM_RELAY_SEQUENCE } from '@/types/team-match';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TeamMatchSetupProps {
  onStartMatch: (setup: TeamSetup) => void;
  isLoading?: boolean;
}

export const TeamMatchSetup = ({ onStartMatch, isLoading }: TeamMatchSetupProps) => {
  const [teamAName, setTeamAName] = useState('Squadra A');
  const [teamBName, setTeamBName] = useState('Squadra B');
  const [teamA, setTeamA] = useState<(string | null)[]>([null, null, null]);
  const [teamB, setTeamB] = useState<(string | null)[]>([null, null, null]);
  const [weapon, setWeapon] = useState('');
  const [matchDate, setMatchDate] = useState<Date>(new Date());

  // Fetch gym members
  const { data: members = [] } = useQuery({
    queryKey: ['gym-members-for-team-match'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_gym_member_names');
      if (error) throw error;
      return data || [];
    },
  });

  const handleTeamAChange = (index: number, value: string) => {
    const newTeam = [...teamA];
    newTeam[index] = value || null;
    setTeamA(newTeam);
  };

  const handleTeamBChange = (index: number, value: string) => {
    const newTeam = [...teamB];
    newTeam[index] = value || null;
    setTeamB(newTeam);
  };

  const isValid = () => {
    const allTeamASelected = teamA.every(a => a !== null);
    const allTeamBSelected = teamB.every(b => b !== null);
    const noOverlap = !teamA.some(a => teamB.includes(a));
    const noDuplicatesA = new Set(teamA.filter(Boolean)).size === teamA.filter(Boolean).length;
    const noDuplicatesB = new Set(teamB.filter(Boolean)).size === teamB.filter(Boolean).length;
    return allTeamASelected && allTeamBSelected && noOverlap && noDuplicatesA && noDuplicatesB;
  };

  const handleStart = () => {
    if (!isValid()) return;
    onStartMatch({
      teamAName,
      teamBName,
      teamA,
      teamB,
      weapon,
      matchDate,
    });
  };

  // Get available athletes (not selected in either team)
  const getAvailableAthletes = (currentTeam: 'A' | 'B', currentIndex: number) => {
    const selectedInA = teamA.filter((_, i) => currentTeam !== 'A' || i !== currentIndex);
    const selectedInB = teamB.filter((_, i) => currentTeam !== 'B' || i !== currentIndex);
    const allSelected = [...selectedInA, ...selectedInB].filter(Boolean);
    return members.filter((m: any) => !allSelected.includes(m.user_id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Setup Incontro a Squadre (3 vs 3)
        </CardTitle>
        <CardDescription>
          Formato staffetta: 9 assalti, target finale 45 stoccate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data Incontro</Label>
            <DatePicker date={matchDate} onDateSelect={(d) => d && setMatchDate(d)} />
          </div>
          <div className="space-y-2">
            <Label>Arma (opzionale)</Label>
            <Select value={weapon} onValueChange={setWeapon}>
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
        </div>

        {/* Teams Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team A */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <Input
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="font-semibold"
                  placeholder="Nome Squadra A"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={`a-${index}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Atleta A{index + 1}
                  </Label>
                  <Select
                    value={teamA[index] || ''}
                    onValueChange={(v) => handleTeamAChange(index, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleziona A${index + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableAthletes('A', index).map((m: any) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Team B */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <Input
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="font-semibold"
                  placeholder="Nome Squadra B"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={`b-${index}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Atleta B{index + 1}
                  </Label>
                  <Select
                    value={teamB[index] || ''}
                    onValueChange={(v) => handleTeamBChange(index, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleziona B${index + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableAthletes('B', index).map((m: any) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Relay Sequence Preview */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Sequenza Assalti (Staffetta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
              {TEAM_RELAY_SEQUENCE.map((bout) => (
                <div
                  key={bout.bout}
                  className="p-2 bg-background rounded border text-center"
                >
                  <div className="font-medium">#{bout.bout}</div>
                  <div className="text-muted-foreground">
                    A{bout.teamAIndex} vs B{bout.teamBIndex}
                  </div>
                  <div className="text-primary font-medium">→{bout.target}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          disabled={!isValid() || isLoading}
          className="w-full"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {isLoading ? 'Creazione in corso...' : 'Inizia Incontro'}
        </Button>

        {!isValid() && (
          <p className="text-sm text-destructive text-center">
            Seleziona 3 atleti diversi per ogni squadra (senza sovrapposizioni)
          </p>
        )}
      </CardContent>
    </Card>
  );
};
