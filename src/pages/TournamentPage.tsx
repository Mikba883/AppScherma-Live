import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { TournamentSetup } from '@/components/tournament/TournamentSetup';
import { TournamentMatrix } from '@/components/tournament/TournamentMatrix';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface TournamentAthlete {
  id: string;
  full_name: string;
}

export interface TournamentMatch {
  athleteA: string;
  athleteB: string;
  scoreA: number | null;
  scoreB: number | null;
  weapon: string | null;
}

const TournamentPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isInstructor, loading: roleLoading } = useUserRole();
  const [selectedAthletes, setSelectedAthletes] = useState<TournamentAthlete[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [tournamentStarted, setTournamentStarted] = useState(false);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isInstructor) {
    return <Navigate to="/" replace />;
  }

  const handleStartTournament = (athletes: TournamentAthlete[]) => {
    setSelectedAthletes(athletes);
    
    // Generate all possible matches (round robin)
    const newMatches: TournamentMatch[] = [];
    for (let i = 0; i < athletes.length; i++) {
      for (let j = i + 1; j < athletes.length; j++) {
        newMatches.push({
          athleteA: athletes[i].id,
          athleteB: athletes[j].id,
          scoreA: null,
          scoreB: null,
          weapon: null,
        });
      }
    }
    
    setMatches(newMatches);
    setTournamentStarted(true);
  };

  const handleUpdateMatch = (athleteA: string, athleteB: string, scoreA: number | null, scoreB: number | null, weapon: string | null) => {
    setMatches(prev => 
      prev.map(match => 
        (match.athleteA === athleteA && match.athleteB === athleteB) ||
        (match.athleteA === athleteB && match.athleteB === athleteA)
          ? { ...match, scoreA, scoreB, weapon }
          : match
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-6 py-6">
          <div className="flex justify-between items-center max-w-none">
            <div className="flex items-center gap-12">
              <div>
                <h1 className="text-3xl font-bold text-primary">Modalità Torneo</h1>
                <p className="text-lg text-muted-foreground mt-1">
                  {tournamentStarted ? 'Inserisci i risultati degli incontri' : 'Seleziona gli atleti partecipanti'}
                </p>
              </div>
              <Navigation />
            </div>
            
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Torna alla Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {!tournamentStarted ? (
          <TournamentSetup onStartTournament={handleStartTournament} />
        ) : (
          <TournamentMatrix 
            athletes={selectedAthletes}
            matches={matches}
            onUpdateMatch={handleUpdateMatch}
            onResetTournament={() => {
              setTournamentStarted(false);
              setSelectedAthletes([]);
              setMatches([]);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default TournamentPage;