import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Check, AlertTriangle, Info, X, Swords, Calendar, User, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  created_by?: string;
  related_bout_id?: string;
}

interface PendingBout {
  id: string;
  bout_date: string;
  weapon: string;
  bout_type: string;
  athlete_a: string;
  athlete_b: string;
  score_a: number | null;
  score_b: number | null;
  created_at: string;
  notes?: string;
  creator_name?: string;
}

interface TournamentMatch {
  id: string;
  bout_date: string;
  weapon: string;
  bout_type: string;
  athlete_a: string;
  athlete_b: string;
  score_a: number;
  score_b: number;
  status: string;
  tournament_id: string;
  tournament_name: string;
  approved_by_a: string | null;
  approved_by_b: string | null;
}

export const NotificationsPanel = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingBouts, setPendingBouts] = useState<PendingBout[]>([]);
  const [pendingTournamentMatches, setPendingTournamentMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingBouts();
      fetchPendingTournamentMatches();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('athlete_id', user.id)
        .eq('read', false) // Solo notifiche non lette
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data?.map(item => ({
        ...item,
        type: item.type as 'info' | 'warning' | 'error'
      })) || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Errore nel caricamento delle notifiche');
    }
  };

  const fetchPendingBouts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_my_pending_bouts');
      
      if (error) throw error;

      // Arricchire i dati con i nomi degli atleti
      if (data?.length > 0) {
        const athleteIds = [...new Set([
          ...data.map((b: PendingBout) => b.athlete_a),
          ...data.map((b: PendingBout) => b.athlete_b)
        ])];

        // Get current user's gym_id
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('user_id', user.id)
          .single();

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', athleteIds)
          .eq('gym_id', userProfile?.gym_id);

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
      toast.error('Errore nel caricamento dei match pending');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTournamentMatches = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_my_pending_tournament_matches');
      
      if (error) throw error;

      setPendingTournamentMatches(data || []);
    } catch (error) {
      console.error('Error fetching pending tournament matches:', error);
      toast.error('Errore nel caricamento dei match di torneo');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
      
      toast.success('Notifica eliminata');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Errore nell\'eliminazione della notifica');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('athlete_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );

      toast.success('Tutte le notifiche sono state segnate come lette');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Errore nel segnare tutte le notifiche come lette');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleBoutDecision = async (boutId: string, decision: 'approve' | 'reject') => {
    setActionLoading(boutId);
    
    try {
      const { error } = await supabase.rpc('decide_bout', {
        _bout_id: boutId,
        _decision: decision
      });

      if (error) throw error;

      toast.success(decision === 'approve' ? "Match approvato" : "Match rifiutato");
      await fetchPendingBouts();
    } catch (error) {
      toast.error(`Impossibile ${decision === 'approve' ? 'approvare' : 'rifiutare'} il match`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTournamentMatchDecision = async (boutId: string, decision: 'approve' | 'reject') => {
    setActionLoading(boutId);
    
    try {
      const { error } = await supabase.rpc('decide_bout', {
        _bout_id: boutId,
        _decision: decision
      });

      if (error) throw error;

      toast.success(decision === 'approve' ? "Match di torneo approvato" : "Match di torneo rifiutato");
      await fetchPendingTournamentMatches();
      await fetchNotifications();
    } catch (error) {
      toast.error(`Impossibile ${decision === 'approve' ? 'approvare' : 'rifiutare'} il match di torneo`);
    } finally {
      setActionLoading(null);
    }
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

  const totalItems = notifications.length + pendingBouts.length + pendingTournamentMatches.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifiche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalItems > 0 ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
            Notifiche
            {totalItems > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalItems}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Match da approvare e notifiche di sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-8">
            <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nessuna notifica</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tournament Matches da Approvare */}
            {pendingTournamentMatches.map((match) => {
              const isAthleteA = match.athlete_a === user?.id;
              const myApproved = isAthleteA ? match.approved_by_a : match.approved_by_b;
              const opponentApproved = isAthleteA ? match.approved_by_b : match.approved_by_a;
              
              return (
                <Card key={match.id} className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Match Torneo da Approvare
                      </CardTitle>
                      <Badge variant="outline">Torneo: {match.tournament_name}</Badge>
                    </div>
                    <CardDescription>
                      {new Date(match.bout_date).toLocaleDateString('it-IT')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Arma</p>
                        <p className="font-medium">{getWeaponLabel(match.weapon)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Punteggio</p>
                        <p className="font-bold text-lg">{match.score_a} - {match.score_b}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo</p>
                        <p className="font-medium">{getTypeLabel(match.bout_type)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>La tua approvazione: {myApproved ? '✓' : '⏳'}</span>
                      <span>Avversario: {opponentApproved ? '✓' : '⏳'}</span>
                    </div>

                    {!myApproved && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleTournamentMatchDecision(match.id, 'approve')}
                          disabled={actionLoading === match.id}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {actionLoading === match.id ? 'Elaborazione...' : 'Approva'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleTournamentMatchDecision(match.id, 'reject')}
                          disabled={actionLoading === match.id}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rifiuta
                        </Button>
                      </div>
                    )}

                    {myApproved && !opponentApproved && (
                      <div className="text-sm text-muted-foreground text-center">
                        Hai già approvato. In attesa dell'avversario...
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Pending Bouts */}
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
                      {new Date(bout.bout_date).toLocaleDateString('it-IT')}
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
                        {bout.score_a !== null && bout.score_b !== null 
                          ? `${bout.score_a} - ${bout.score_b}`
                          : '--- - ---'
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Risultato</p>
                      <Badge variant={bout.score_b !== null && bout.score_a !== null && bout.score_b > bout.score_a ? "default" : "secondary"}>
                        {bout.score_b !== null && bout.score_a !== null 
                          ? (bout.score_b > bout.score_a ? "Vittoria" : "Sconfitta")
                          : "Da definire"
                        }
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
                      onClick={() => handleBoutDecision(bout.id, 'approve')}
                      disabled={actionLoading === bout.id}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {actionLoading === bout.id ? 'Elaborazione...' : 'Approva'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleBoutDecision(bout.id, 'reject')}
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

            {/* System Notifications */}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {notification.title}
                        </h4>
                        <Badge 
                          variant={getNotificationBadge(notification.type) as any}
                          className="text-xs"
                        >
                          {notification.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                    className="ml-2 mobile-touch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};