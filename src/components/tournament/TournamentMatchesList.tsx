import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TournamentMatch, TournamentAthlete } from "@/types/tournament";
import { Edit2, Check } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TournamentMatchesListProps {
  athletes: TournamentAthlete[];
  matches: TournamentMatch[];
  onUpdateMatch: (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => void;
  currentUserId: string;
  tournamentCreatorId: string;
  organizerRole: 'instructor' | 'student';
}

export const TournamentMatchesList = ({
  athletes,
  matches,
  onUpdateMatch,
  currentUserId,
  tournamentCreatorId,
  organizerRole,
}: TournamentMatchesListProps) => {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<{ scoreA: string; scoreB: string; weapon: string }>({
    scoreA: '',
    scoreB: '',
    weapon: ''
  });

  const isCreator = currentUserId === tournamentCreatorId;

  const canEditMatch = (athleteA: string, athleteB: string): boolean => {
    if (!currentUserId) return false;
    if (isCreator || organizerRole === 'instructor') return true;
    return athleteA === currentUserId || athleteB === currentUserId;
  };

  const getAthleteNameById = (id: string) => {
    return athletes.find(a => a.id === id)?.full_name || 'Unknown';
  };

  const getMatchKey = (athleteA: string, athleteB: string) => {
    return `${athleteA}-${athleteB}`;
  };

  const getMatch = (athleteA: string, athleteB: string) => {
    return matches.find(m => m.athleteA === athleteA && m.athleteB === athleteB);
  };

  // Filtra i match: organizzatore vede tutto, partecipante solo i suoi
  const visibleMatches = (isCreator || organizerRole === 'instructor')
    ? matches
    : matches.filter(m => m.athleteA === currentUserId || m.athleteB === currentUserId);

  const handleStartEdit = (athleteA: string, athleteB: string) => {
    const match = getMatch(athleteA, athleteB);
    setEditingMatch(getMatchKey(athleteA, athleteB));
    setEditScores({
      scoreA: match?.scoreA?.toString() || '',
      scoreB: match?.scoreB?.toString() || '',
      weapon: match?.weapon || ''
    });
  };

  const handleSaveEdit = (athleteA: string, athleteB: string) => {
    const scoreA = editScores.scoreA ? parseInt(editScores.scoreA) : null;
    const scoreB = editScores.scoreB ? parseInt(editScores.scoreB) : null;
    const weapon = editScores.weapon || null;
    
    onUpdateMatch(athleteA, athleteB, scoreA, scoreB, weapon);
    setEditingMatch(null);
  };

  const handleCancelEdit = () => {
    setEditingMatch(null);
    setEditScores({ scoreA: '', scoreB: '', weapon: '' });
  };

  const isMatchComplete = (match: TournamentMatch | undefined) => {
    return match && match.scoreA !== null && match.scoreB !== null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Organizzazione Turni
          {!(isCreator || organizerRole === 'instructor') && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Solo i tuoi match)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visibleMatches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nessun match disponibile
          </p>
        ) : (
          <div className="space-y-3">
            {visibleMatches.map((match) => {
              const matchKey = getMatchKey(match.athleteA, match.athleteB);
              const isEditing = editingMatch === matchKey;
              const canEdit = canEditMatch(match.athleteA, match.athleteB);
              const isComplete = isMatchComplete(match);

              return (
                <Card key={matchKey} className="border-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium truncate">
                            {getAthleteNameById(match.athleteA)}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium truncate">
                            {getAthleteNameById(match.athleteB)}
                          </span>
                          {isComplete && (
                            <Badge variant="secondary" className="ml-2">
                              <Check className="w-3 h-3 mr-1" />
                              Completato
                            </Badge>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="grid grid-cols-5 gap-2 items-end">
                            <div>
                              <Label className="text-xs">Punteggio A</Label>
                              <Input
                                type="number"
                                min="0"
                                max="45"
                                value={editScores.scoreA}
                                onChange={(e) => setEditScores({...editScores, scoreA: e.target.value})}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Punteggio B</Label>
                              <Input
                                type="number"
                                min="0"
                                max="45"
                                value={editScores.scoreB}
                                onChange={(e) => setEditScores({...editScores, scoreB: e.target.value})}
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Arma</Label>
                              <Select 
                                value={editScores.weapon} 
                                onValueChange={(value) => setEditScores({...editScores, weapon: value})}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleziona arma" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fioretto">Fioretto</SelectItem>
                                  <SelectItem value="spada">Spada</SelectItem>
                                  <SelectItem value="sciabola">Sciabola</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveEdit(match.athleteA, match.athleteB)}
                                className="h-8 px-2"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleCancelEdit}
                                className="h-8 px-2"
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            {isComplete ? (
                              <>
                                <div className="text-sm">
                                  <span className="font-semibold">{match.scoreA}</span>
                                  <span className="mx-2">-</span>
                                  <span className="font-semibold">{match.scoreB}</span>
                                </div>
                                {match.weapon && (
                                  <Badge variant="outline" className="capitalize">
                                    {match.weapon}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                In attesa di risultato
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {!isEditing && canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(match.athleteA, match.athleteB)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          {isComplete ? 'Modifica' : 'Inserisci'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
