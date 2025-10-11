import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TournamentMatchCardProps {
  match: {
    bout_id: string;
    opponent_name: string;
    my_score: number;
    opponent_score: number;
    weapon: string | null;
    bout_type: string;
    status: string;
    i_approved: boolean;
    opponent_approved: boolean;
  };
  onApproved: () => void;
}

export const TournamentMatchCard = ({ match, onApproved }: TournamentMatchCardProps) => {
  const [approving, setApproving] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setApproving(true);
    try {
      const { error } = await supabase.rpc('approve_tournament_match', {
        _bout_id: match.bout_id,
      });

      if (error) throw error;

      toast({
        title: 'Match Approvato',
        description: match.opponent_approved 
          ? 'Il match è ora ufficiale e conta per il ranking!' 
          : 'In attesa dell\'approvazione del tuo avversario',
      });

      onApproved();
    } catch (error: any) {
      console.error('Error approving match:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile approvare il match',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  const getWeaponLabel = (weapon: string | null) => {
    if (!weapon) return 'Non specificata';
    const labels: { [key: string]: string } = {
      fioretto: 'Fioretto',
      spada: 'Spada',
      sciabola: 'Sciabola',
    };
    return labels[weapon] || weapon;
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      sparring: 'Sparring',
      gara: 'Gara',
      bianco: 'Bianco',
    };
    return labels[type] || type;
  };

  const isWinner = match.my_score > match.opponent_score;
  const isApproved = match.status === 'approved';

  return (
    <Card className={`p-4 ${isApproved ? 'bg-success/5 border-success/20' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">vs {match.opponent_name}</span>
            <Badge variant={isWinner ? 'default' : 'secondary'} className="text-xs">
              {match.my_score} - {match.opponent_score}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getWeaponLabel(match.weapon)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(match.bout_type)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {match.i_approved ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-success">Approvato da te</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-warning">In attesa della tua approvazione</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {match.opponent_approved ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-success">Approvato da avversario</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>In attesa avversario</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <Badge className="bg-success text-success-foreground">
              <CheckCheck className="h-4 w-4 mr-1" />
              Ufficiale
            </Badge>
          ) : !match.i_approved ? (
            <Button
              onClick={handleApprove}
              disabled={approving}
              size="sm"
            >
              {approving ? 'Approvando...' : 'Approva'}
            </Button>
          ) : (
            <Badge variant="outline" className="text-warning border-warning">
              <Clock className="h-4 w-4 mr-1" />
              In attesa
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
