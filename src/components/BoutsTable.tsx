import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Filters } from '@/pages/ConsultationPage';

interface BoutData {
  id: string;
  bout_date: string;
  weapon: string;
  bout_type: string;
  status: string;
  athlete_a: string;
  athlete_a_name: string;
  athlete_b: string;
  athlete_b_name: string;
  score_a: number;
  score_b: number;
}

interface BoutsTableProps {
  filters: Filters;
}

export const BoutsTable = ({ filters }: BoutsTableProps) => {
  const [data, setData] = useState<BoutData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoutsData();
  }, [filters]);

  const fetchBoutsData = async () => {
    setLoading(true);
    try {
      const { data: boutsData, error } = await supabase.rpc('list_bouts', {
        _from: filters.dateFrom || null,
        _to: filters.dateTo || null,
        _gender: filters.gender || null,
        _min_age: filters.minAge || null,
        _max_age: filters.maxAge || null,
        _weapon: filters.weapon || null,
        _athletes: filters.athletes || null
      });

      if (error) throw error;
      setData(boutsData || []);
    } catch (error) {
      console.error('Error fetching bouts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = ['Data', 'Arma', 'Tipo', 'Atleta A', 'Atleta B', 'Punti A', 'Punti B', 'Vincitore'];
    const csvData = data.map(row => [
      new Date(row.bout_date).toLocaleDateString('it-IT'),
      getWeaponLabel(row.weapon),
      getTypeLabel(row.bout_type),
      row.athlete_a_name,
      row.athlete_b_name,
      row.score_a,
      row.score_b,
      row.score_a > row.score_b ? row.athlete_a_name : row.athlete_b_name
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `elenco_match_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getWeaponLabel = (weapon: string) => {
    const labels: Record<string, string> = {
      'fioretto': 'Fioretto',
      'spada': 'Spada',
      'sciabola': 'Sciabola'
    };
    return labels[weapon] || weapon;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'sparring': 'Sparring',
      'gara': 'Gara',
      'bianco': 'Bianco'
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'gara': return 'default';
      case 'sparring': return 'secondary';
      case 'bianco': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Nessun match disponibile con i filtri selezionati.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {data.length} match trovati
        </p>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arma</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Atleta A</TableHead>
                <TableHead>Atleta B</TableHead>
                <TableHead className="text-center">Punteggio</TableHead>
                <TableHead>Vincitore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDate(row.bout_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getWeaponLabel(row.weapon)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(row.bout_type)}>
                      {getTypeLabel(row.bout_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.athlete_a_name}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.athlete_b_name}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`font-bold ${row.score_a > row.score_b ? 'text-primary' : 'text-muted-foreground'}`}>
                        {row.score_a}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className={`font-bold ${row.score_b > row.score_a ? 'text-primary' : 'text-muted-foreground'}`}>
                        {row.score_b}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.score_a > row.score_b ? "default" : "secondary"}>
                      {row.score_a > row.score_b ? row.athlete_a_name : row.athlete_b_name}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};