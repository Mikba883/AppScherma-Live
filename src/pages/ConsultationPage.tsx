import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterPanel } from '@/components/FilterPanel';
import { SummaryTable } from '@/components/SummaryTable';
import { BoutsTable } from '@/components/BoutsTable';
import { GlobalStats } from '@/components/GlobalStats';
import { ArrowLeft, Table, Users, BarChart3 } from 'lucide-react';

export interface Filters {
  dateFrom?: string;
  dateTo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  weapon?: string;
  athletes?: string[];
  tipoMatch?: string;
  turni?: string;
}

const ConsultationPage = () => {
  const { user, loading } = useAuth();
  const { isInstructor, loading: roleLoading, role } = useUserRole();
  const [filters, setFilters] = useState<Filters>({});

  console.log('[ConsultationPage] State:', {
    user: !!user,
    loading,
    roleLoading,
    isInstructor,
    role
  });

  if (loading || roleLoading) {
    console.log('[ConsultationPage] Loading state - auth loading:', loading, 'role loading:', roleLoading);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            Caricamento... {loading && 'Auth'} {roleLoading && 'Role'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[ConsultationPage] No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile yet, keep loading
  if (user && roleLoading) {
    console.log('[ConsultationPage] User exists but role still loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  // Add debug info for render
  console.log('[ConsultationPage] Rendering page - isInstructor:', isInstructor);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6">
          {/* Mobile Layout - Stack vertically */}
          <div className="flex flex-col gap-3 sm:hidden">
            <Link to="/" className="self-start">
              <Button variant="outline" size="sm" className="mobile-touch">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold text-primary">Consultazione</h1>
              <p className="text-xs text-muted-foreground">Analisi dati</p>
            </div>
          </div>
          
          {/* Desktop Layout - Side by side */}
          <div className="hidden sm:flex items-center gap-6">
            <Link to="/">
              <Button variant="outline" size="lg" className="px-6 py-3">
                <ArrowLeft className="w-5 h-5 mr-3" />
                <span className="text-base">Dashboard</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-primary">Consultazione Dati</h1>
              <p className="text-muted-foreground">
                Analisi dati
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-8 space-y-8">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtri</CardTitle>
            <CardDescription>
              Personalizza la vista dei dati applicando i filtri desiderati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FilterPanel filters={filters} onFiltersChange={setFilters} isInstructor={isInstructor} />
          </CardContent>
        </Card>

        {/* Tables */}
        {isInstructor ? (
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary" className="flex items-center gap-1 sm:gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Riassunto per Atleta</span>
                <span className="sm:hidden text-xs">Atleti</span>
              </TabsTrigger>
              <TabsTrigger value="bouts" className="flex items-center gap-1 sm:gap-2">
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">Lista Completa Match</span>
                <span className="sm:hidden text-xs">Match</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Statistiche Globali</span>
                <span className="sm:hidden text-xs">Stats</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Riassunto per Atleta</CardTitle>
                    <CardDescription>
                      Statistiche aggregate per ogni atleta nel periodo selezionato
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <SummaryTable filters={filters} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bouts">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Lista Completa Match</CardTitle>
                    <CardDescription>
                      Elenco dettagliato di tutti i match approvati
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <BoutsTable filters={filters} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Statistiche Globali</CardTitle>
                    <CardDescription>
                      Analisi aggregate dei dati del club e statistiche di attività
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <GlobalStats filters={filters} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>I Tuoi Match</CardTitle>
                <CardDescription>
                  Elenco dei tuoi match approvati
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BoutsTable filters={filters} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ConsultationPage;