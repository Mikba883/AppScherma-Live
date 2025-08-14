import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterPanel } from '@/components/FilterPanel';
import { SummaryTable } from '@/components/SummaryTable';
import { BoutsTable } from '@/components/BoutsTable';
import { ArrowLeft, Download, Table, Users } from 'lucide-react';

export interface Filters {
  dateFrom?: string;
  dateTo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  weapon?: string;
  athletes?: string[];
}

const ConsultationPage = () => {
  const { user, loading } = useAuth();
  const [filters, setFilters] = useState<Filters>({});

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">Consultazione Dati</h1>
              <p className="text-muted-foreground">
                Analizza le performance del team con filtri avanzati
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtri</CardTitle>
            <CardDescription>
              Personalizza la vista dei dati applicando i filtri desiderati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FilterPanel filters={filters} onFiltersChange={setFilters} />
          </CardContent>
        </Card>

        {/* Tables */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Riassunto per Atleta
            </TabsTrigger>
            <TabsTrigger value="bouts" className="flex items-center gap-2">
              <Table className="w-4 h-4" />
              Lista Completa Match
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
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Esporta CSV
                </Button>
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
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Esporta CSV
                </Button>
              </CardHeader>
              <CardContent>
                <BoutsTable filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ConsultationPage;