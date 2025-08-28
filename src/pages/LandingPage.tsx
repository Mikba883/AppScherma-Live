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
      <section className="py-16 sm:py-20 md:py-24 lg:py-32 px-4 bg-gradient-to-b from-background via-secondary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              Tutto quello che serve per la tua palestra
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Una piattaforma completa per gestire, motivare e far crescere i tuoi atleti
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 xl:gap-16 max-w-7xl mx-auto">
            <FeatureCard 
              icon={<Users className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />}
              title="Gestione Allenamenti"
              description="Pianifica sessioni, traccia progressi e monitora le performance di ogni atleta con strumenti professionali"
            />
            <FeatureCard 
              icon={<Trophy className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />}
              title="Sistema Gamification"
              description="Aumenta l'engagement con badge, classifiche e obiettivi personalizzati che motivano gli atleti a migliorare"
            />
            <FeatureCard 
              icon={<TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />}
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
    <div className="bg-card p-6 sm:p-8 lg:p-10 rounded-xl lg:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
      <div className="text-primary mb-4 sm:mb-6 lg:mb-8">{icon}</div>
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">{title}</h3>
      <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed flex-grow">{description}</p>
    </div>
  );
};

export default LandingPage;