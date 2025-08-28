import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Swords, Shield, Trophy, Users } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <img 
              src="/en-garde-logo.png" 
              alt="En Garde" 
              className="mx-auto h-24 w-auto mb-8"
            />
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              En Garde
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Il sistema di gestione completo per la tua palestra di scherma. 
              Traccia incontri, monitora progressi e gestisci i tuoi atleti con facilità.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button
                size="lg"
                onClick={() => navigate('/create-gym')}
                className="text-lg px-8 py-6"
              >
                <Swords className="mr-2 h-5 w-5" />
                Registra la tua Palestra
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-6"
              >
                Accedi
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary">
              Tutto ciò che serve
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Gestione completa per palestre di scherma
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Trophy className="h-5 w-5 flex-none text-primary" />
                  Tracciamento Incontri
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    Registra e monitora tutti gli incontri di sparring e gara dei tuoi atleti.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Shield className="h-5 w-5 flex-none text-primary" />
                  Sistema ELO
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    Classifica automatica degli atleti basata sulle performance con sistema ELO avanzato.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Users className="h-5 w-5 flex-none text-primary" />
                  Gestione Atleti
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    Organizza atleti per turni, monitora progressi e gestisci tornei interni.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;