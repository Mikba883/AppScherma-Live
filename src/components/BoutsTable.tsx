import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Filters } from '@/pages/ConsultationPage';
import { formatDateItalian } from '@/lib/date-utils';

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
  const { user } = useAuth();
  const { isInstructor } = useUserRole();
  const [data, setData] = useState<BoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBoutsData();
  }, [filters, isInstructor, user]);

  const fetchBoutsData = async () => {
    setLoading(true);
    try {
      // Debug logging
      console.log('BoutsTable - User:', user?.id);
      console.log('BoutsTable - isInstructor:', isInstructor);
      console.log('BoutsTable - Original filters:', filters);
      
      // For students: if athlete filter is applied, find matches against selected athletes
      // For instructors: use athlete filter as-is
      let athletesFilter = null;
      if (!isInstructor && user) {
        if (filters.athletes && filters.athletes.length > 0) {
          // Student with athlete filter: show matches where user plays against selected athletes
          // We pass only the selected opponents, the SQL will filter for matches involving the user
          athletesFilter = filters.athletes;
        } else {
          // Student without filter: show all their matches
          athletesFilter = [user.id];
        }
      } else if (isInstructor) {
        // Instructor: use filter as-is
        athletesFilter = filters.athletes || null;
      }
      
      console.log('BoutsTable - Athletes filter being applied:', athletesFilter);
      
      // Debug date filters
      console.log('BoutsTable - Date filters:', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        fromFormatted: filters.dateFrom ? new Date(filters.dateFrom).toISOString().split('T')[0] : null,
        toFormatted: filters.dateTo ? new Date(filters.dateTo).toISOString().split('T')[0] : null
      });

      // Special handling for student athlete filter
      let finalAthletesFilter = athletesFilter;
      if (!isInstructor && user && filters.athletes && filters.athletes.length > 0) {
        // For students, we need a different approach: 
        // We want matches where the student participates AND the opponent is in the selected list
        // This requires a modified query approach
        finalAthletesFilter = [user.id, ...filters.athletes];
      }

      const rpcParams = {
        _from: filters.dateFrom || null,
        _to: filters.dateTo || null,
        _gender: filters.gender || null,
        _min_age: filters.minAge || null,
        _max_age: filters.maxAge || null,
        _weapon: filters.weapon || null,
        _athletes: finalAthletesFilter,
        _tipo_match: filters.tipoMatch || null,
        _turni: filters.turni || null
      };
      
      console.log('BoutsTable - RPC parameters:', rpcParams);

      const { data: boutsData, error } = await supabase.rpc('list_bouts', rpcParams);

      if (error) throw error;
      
      // For students with athlete filter, further filter the results
      let finalData = boutsData || [];
      if (!isInstructor && user && filters.athletes && filters.athletes.length > 0) {
        finalData = (boutsData || []).filter(bout => {
          // Keep matches where the student participates AND the opponent is in selected athletes
          const isStudentAthleteA = bout.athlete_a === user.id;
          const isStudentAthleteB = bout.athlete_b === user.id;
          
          if (isStudentAthleteA) {
            return filters.athletes!.includes(bout.athlete_b);
          } else if (isStudentAthleteB) {
            return filters.athletes!.includes(bout.athlete_a);
          }
          return false;
        });
      }
      
      console.log('BoutsTable - Data received:', boutsData?.length, 'matches');
      console.log('BoutsTable - Final filtered data:', finalData.length, 'matches');
      console.log('BoutsTable - Date range in results:', {
        earliest: boutsData?.length > 0 ? Math.min(...boutsData.map(b => new Date(b.bout_date).getTime())) : null,
        latest: boutsData?.length > 0 ? Math.max(...boutsData.map(b => new Date(b.bout_date).getTime())) : null,
        earliestFormatted: boutsData?.length > 0 ? new Date(Math.min(...boutsData.map(b => new Date(b.bout_date).getTime()))).toISOString().split('T')[0] : null,
        latestFormatted: boutsData?.length > 0 ? new Date(Math.max(...boutsData.map(b => new Date(b.bout_date).getTime()))).toISOString().split('T')[0] : null
      });
      setData(finalData);
    } catch (error) {
      console.error('Error fetching bouts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!isInstructor) {
      toast.error('Solo gli istruttori possono cancellare gli incontri');
      return;
    }

    setDeletingId(matchId);
    
    try {
      const { error } = await supabase.rpc('delete_bout_with_notification', {
        _bout_id: matchId
      });

      if (error) {
        throw error;
      }

      toast.success('Incontro cancellato con successo. Gli atleti sono stati notificati.');
      
      // Remove the deleted match from the local state
      setData(prev => prev.filter(match => match.id !== matchId));
      
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Errore nella cancellazione dell\'incontro');
    } finally {
      setDeletingId(null);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = ['Data', 'Arma', 'Tipo', 'Atleta A', 'Atleta B', 'Punti A', 'Punti B', 'Vincitore'];
    const csvData = data.map(row => [
      formatDateItalian(row.bout_date),
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
    return formatDateItalian(dateString);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Count active filters for UX
  const activeFiltersCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  }).length;

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter status */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>
            {activeFiltersCount > 0 && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                {activeFiltersCount} filtri attivi
              </span>
            )}
          </div>
          <div>0 match trovati</div>
        </div>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {activeFiltersCount > 0 ? 'Nessun match trovato con i filtri applicati' : 'Nessun match disponibile'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter status and results info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div>
          {activeFiltersCount > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
              {activeFiltersCount} filtri attivi
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>{data.length} match trovati</span>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
        </div>
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
                {isInstructor && <TableHead className="text-center">Azioni</TableHead>}
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
                  {isInstructor && (
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={deletingId === row.id}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancellare incontro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler cancellare l'incontro tra {row.athlete_a_name} e {row.athlete_b_name} del {formatDate(row.bout_date)}?
                              <br /><br />
                              <strong>Questa azione non può essere annullata.</strong> Gli atleti riceveranno una notifica della cancellazione.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteMatch(row.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sì, Cancella
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};