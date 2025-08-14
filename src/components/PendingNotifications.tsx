import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Check, X, Swords, Calendar, User } from 'lucide-react';

interface PendingBout {
  id: string;
  bout_date: string;
  weapon: string;
  bout_type: string;
  athlete_a: string;
  athlete_b: string;
  score_a: number;
  score_b: number;
  created_at: string;
  notes?: string;
  creator_name?: string;
}

export const PendingNotifications = () => {
  const [pendingBouts, setPendingBouts] = useState<PendingBout[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingBouts();
  }, []);

  const fetchPendingBouts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_pending_bouts');
      
      if (error) throw error;

      // Arricchire i dati con i nomi degli atleti
      if (data?.length > 0) {
        const athleteIds = [...new Set([
          ...data.map((b: PendingBout) => b.athlete_a),
          ...data.map((b: PendingBout) => b.athlete_b)
        ])];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', athleteIds);

        if (profilesError) throw profilesError;

        const profilesMap = profiles?.reduce((acc, p) => {
          acc[p.user_id] = p.full_name;
          return acc;
        }, {} as Record<string, string>) || {};

        const enrichedBouts = data.map((bout: PendingBout) => ({
          ...bout,
          creator_name: profilesMap[bout.athlete_a] || 'Sconosciuto'
        }));

        setPendingBouts(enrichedBouts);
      } else {
        setPendingBouts([]);
      }
    } catch (error) {
      console.error('Error fetching pending bouts:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le notifiche",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (boutId: string, decision: 'approve' | 'reject') => {
    setActionLoading(boutId);
    
    try {
      const { error } = await supabase.rpc('decide_bout', {
        _bout_id: boutId,
        _decision: decision
      });

      if (error) throw error;

      toast({
        title: decision === 'approve' ? "Match approvato" : "Match rifiutato",
        description: `Il match è stato ${decision === 'approve' ? 'approvato' : 'rifiutato'} con successo.`
      });

      // Ricarica le notifiche
      await fetchPendingBouts();
    } catch (error) {
      toast({
        title: "Errore",
        description: `Impossibile ${decision === 'approve' ? 'approvare' : 'rifiutare'} il match`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
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
      'bianco': 'Assalto Bianco'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (pendingBouts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="p-4 bg-muted/50 rounded-lg inline-block">
          <Check className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            Nessun match in attesa di approvazione
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingBouts.map((bout) => (
        <Card key={bout.id} className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Nuovo Match da Approvare
              </CardTitle>
              <Badge variant="outline">{getTypeLabel(bout.bout_type)}</Badge>
            </div>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(bout.bout_date)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {bout.creator_name}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Arma</p>
                <p className="font-medium">{getWeaponLabel(bout.weapon)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Punteggio</p>
                <p className="font-bold text-lg">
                  {bout.score_a} - {bout.score_b}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Risultato</p>
                <Badge variant={bout.score_b > bout.score_a ? "default" : "secondary"}>
                  {bout.score_b > bout.score_a ? "Vittoria" : "Sconfitta"}
                </Badge>
              </div>
            </div>

            {bout.notes && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Note:</p>
                <p className="text-sm">{bout.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleDecision(bout.id, 'approve')}
                disabled={actionLoading === bout.id}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                {actionLoading === bout.id ? 'Elaborazione...' : 'Approva'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDecision(bout.id, 'reject')}
                disabled={actionLoading === bout.id}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Rifiuta
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};