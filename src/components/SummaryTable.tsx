import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Filters } from '@/pages/ConsultationPage';
import { formatDateItalian } from '@/lib/date-utils';

interface SummaryData {
  athlete_id: string;
  full_name: string;
  ranking_position: number;
  elo_rating: number;
  matches: number;
  trainings: number;
  wins: number;
  win_rate: number;
  avg_point_diff: number;
  avg_hits_given: number;
  avg_hits_received: number;
  last_training: string | null;
}

interface SummaryTableProps {
  filters: Filters;
}

export const SummaryTable = ({ filters }: SummaryTableProps) => {
  const [data, setData] = useState<SummaryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummaryData();
  }, [filters]);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const { data: summaryData, error } = await supabase.rpc('summary_by_athlete', {
        _from: filters.dateFrom || null,
        _to: filters.dateTo || null,
        _gender: filters.gender || null,
        _min_age: filters.minAge || null,
        _max_age: filters.maxAge || null,
        _weapon: filters.weapon || null,
        _athletes: filters.athletes || null,
        _tipo_match: filters.tipoMatch || null,
        _turni: filters.turni || null
      });

      if (error) throw error;
      setData(summaryData || []);
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = ['Posizione', 'Atleta', 'ELO', 'Match', 'Allenamenti', 'Vittorie', 'Win Rate %', 'Scarto Medio', 'Ultimo Allenamento'];
    const csvData = data.map(row => [
      row.ranking_position,
      row.full_name,
      row.elo_rating,
      row.matches,
      row.trainings,
      row.wins,
      `${(row.win_rate * 100).toFixed(1)}%`,
      row.avg_point_diff?.toFixed(1) || '0.0',
      formatDateItalian(row.last_training)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riassunto_atleti_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const formatWinRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;
  const formatPointDiff = (diff: number) => {
    if (diff === null || diff === undefined) return '0.0';
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };
  const formatDate = (dateString: string | null) => {
    return formatDateItalian(dateString);
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
          Nessun dato disponibile con i filtri selezionati.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {data.length} atleti trovati
        </p>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Pos.</TableHead>
              <TableHead>Atleta</TableHead>
              <TableHead className="w-20 text-center">ELO</TableHead>
              <TableHead className="text-center">Match</TableHead>
              <TableHead className="text-center">Allenamenti</TableHead>
              <TableHead className="text-center">Vittorie</TableHead>
              <TableHead className="text-center">Win Rate</TableHead>
              <TableHead className="text-center">Scarto Medio</TableHead>
              <TableHead>Ultimo Allenamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.athlete_id}>
                <TableCell className="text-center font-bold">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    row.ranking_position <= 3 
                      ? 'bg-primary text-primary-foreground' 
                      : row.ranking_position <= 10 
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {row.ranking_position}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{row.full_name}</TableCell>
                <TableCell className="text-center font-mono text-sm">
                  <span className="font-semibold text-primary">{row.elo_rating}</span>
                </TableCell>
                <TableCell className="text-center">{row.matches}</TableCell>
                <TableCell className="text-center">{row.trainings}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.wins > row.matches / 2 ? "default" : "secondary"}>
                    {row.wins}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono">
                  {formatWinRate(row.win_rate)}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {formatPointDiff(row.avg_point_diff)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(row.last_training)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};