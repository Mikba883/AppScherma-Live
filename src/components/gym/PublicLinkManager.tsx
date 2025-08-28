import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from '@/hooks/useGym';
import { Link2, Copy, Share2, QrCode, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PublicLink {
  id: string;
  token: string;
  is_active: boolean;
  uses_count: number;
  max_uses: number | null;
  created_at: string;
}

const PublicLinkManager = () => {
  const [publicLink, setPublicLink] = useState<PublicLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrDialog, setShowQrDialog] = useState(false);
  const { gym } = useGym();
  const { toast } = useToast();

  useEffect(() => {
    if (gym) {
      fetchPublicLink();
    }
  }, [gym]);

  const fetchPublicLink = async () => {
    if (!gym) return;

    const { data, error } = await supabase
      .from('gym_public_links')
      .select('*')
      .eq('gym_id', gym.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public link:', error);
    } else {
      setPublicLink(data);
      if (data) {
        generateQrCode(data.token);
      }
    }
  };

  const generateQrCode = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const generatePublicLink = async () => {
    if (!gym) return;

    setLoading(true);
    const token = crypto.randomUUID();

    const { data, error } = await supabase
      .from('gym_public_links')
      .insert({
        gym_id: gym.id,
        token,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile generare il link pubblico',
        variant: 'destructive',
      });
    } else {
      setPublicLink(data);
      generateQrCode(data.token);
      toast({
        title: 'Link creato',
        description: 'Il link pubblico è stato generato con successo',
      });
    }
    setLoading(false);
  };

  const toggleLinkStatus = async () => {
    if (!publicLink) return;

    const { error } = await supabase
      .from('gym_public_links')
      .update({ is_active: !publicLink.is_active })
      .eq('id', publicLink.id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato del link',
        variant: 'destructive',
      });
    } else {
      setPublicLink({ ...publicLink, is_active: !publicLink.is_active });
      toast({
        title: publicLink.is_active ? 'Link disattivato' : 'Link attivato',
        description: publicLink.is_active 
          ? 'Il link pubblico è stato disattivato' 
          : 'Il link pubblico è stato riattivato',
      });
    }
  };

  const copyLink = () => {
    if (!publicLink) return;
    
    const url = `${window.location.origin}/join/${publicLink.token}`;
    navigator.clipboard.writeText(url);
    
    toast({
      title: 'Link copiato',
      description: 'Il link è stato copiato negli appunti',
    });
  };

  const shareOnWhatsApp = () => {
    if (!publicLink || !gym) return;
    
    const url = `${window.location.origin}/join/${publicLink.token}`;
    const message = `Unisciti alla palestra ${gym.name}! 🤺\n\nClicca su questo link per registrarti come allievo:\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const getPublicUrl = () => {
    if (!publicLink) return '';
    return `${window.location.origin}/join/${publicLink.token}`;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Link Pubblico per Allievi
        </CardTitle>
        <CardDescription>
          Genera un link pubblico che gli allievi possono usare per iscriversi autonomamente alla tua palestra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!publicLink ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Nessun link pubblico attivo. Genera un link per permettere agli allievi di iscriversi.
              </AlertDescription>
            </Alert>
            <Button onClick={generatePublicLink} disabled={loading}>
              <Link2 className="h-4 w-4 mr-2" />
              Genera Link Pubblico
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link di iscrizione</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={getPublicUrl()} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  title="Copia link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant={publicLink.is_active ? 'default' : 'secondary'}>
                  {publicLink.is_active ? 'Attivo' : 'Disattivato'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{publicLink.uses_count} iscrizioni</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLinkStatus}
                title={publicLink.is_active ? 'Disattiva link' : 'Attiva link'}
              >
                {publicLink.is_active ? (
                  <ToggleRight className="h-5 w-5 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={shareOnWhatsApp}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Condividi su WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowQrDialog(true)}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Mostra QR Code
              </Button>
            </div>

            {publicLink.is_active && (
              <Alert>
                <AlertDescription>
                  Questo link può essere condiviso pubblicamente. Chiunque lo possieda potrà registrarsi come allievo nella tua palestra.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code per iscrizione</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              )}
              <p className="text-sm text-muted-foreground text-center">
                Scansiona questo codice per accedere al link di iscrizione
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PublicLinkManager;