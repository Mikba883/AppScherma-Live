import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Swords, Users, TrendingUp, Trophy } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-8">
            {/* Logo and Title */}
            <div className="flex justify-center mb-6">
              <img 
                src="https://topkzcumjilaxbprufyo.supabase.co/storage/v1/object/public/gym-logos/ChatGPT%20Image%2028%20ago%202025,%2007_37_57.png" 
                alt="En Garde" 
                className="h-32 w-auto object-contain"
              />
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                En Garde
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Il sistema di gestione completo per la tua palestra di scherma
            </p>

            {/* Main CTA */}
            <div className="pt-8">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                onClick={() => navigate('/create-gym')}
              >
                <Swords className="mr-2 h-5 w-5" />
                Registra la tua Palestra
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto min-w-[200px]"
              >
                Accedi come Atleta
              </Button>
              <span className="text-muted-foreground hidden sm:inline">oppure</span>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto min-w-[200px]"
              >
                Accedi come Istruttore
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[50%] top-0 h-[500px] w-[500px] -translate-x-[50%] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-[20%] top-[20%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-2xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background via-secondary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tutto quello che serve per la tua palestra
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Una piattaforma completa per gestire, motivare e far crescere i tuoi atleti
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
            <FeatureCard 
              icon={<Users className="h-12 w-12" />}
              title="Gestione Allenamenti"
              description="Pianifica sessioni, traccia progressi e monitora le performance di ogni atleta con strumenti professionali"
            />
            <FeatureCard 
              icon={<Trophy className="h-12 w-12" />}
              title="Sistema Gamification"
              description="Aumenta l'engagement con badge, classifiche e obiettivi personalizzati che motivano gli atleti a migliorare"
            />
            <FeatureCard 
              icon={<TrendingUp className="h-12 w-12" />}
              title="Analytics Avanzate"
              description="Dashboard completa con metriche dettagliate per ottimizzare gli allenamenti e monitorare la crescita"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 En Garde - Sistema di Gestione per Palestre di Scherma</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};

export default LandingPage;