import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  alwaysShow?: boolean;
}

export const InstallPrompt = ({ alwaysShow = false }: InstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if prompt was recently dismissed (skip if alwaysShow is true)
    if (!alwaysShow) {
      const dismissed = localStorage.getItem('installPromptDismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt immediately
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show the prompt immediately if not in standalone mode
    if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  // iOS specific instructions
  if (isIOS) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-background/95 backdrop-blur border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Installa En Garde</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Per installare l'app su iOS:
            </p>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Tocca il pulsante Condividi <span className="inline-block">⎋</span></li>
              <li>2. Scorri e seleziona "Aggiungi a Home"</li>
              <li>3. Tocca "Aggiungi" in alto a destra</li>
            </ol>
          </div>
        </div>
      </Card>
    );
  }

  // Standard PWA install prompt
  return (
    <Card 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-background/95 backdrop-blur border-primary/20 cursor-pointer hover:bg-background/98 transition-colors"
      onClick={handleInstallClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Installa En Garde</h3>
          <p className="text-xs text-muted-foreground">
            Tocca qui per installare l'app e accedere rapidamente dalla tua home screen!
          </p>
        </div>
      </div>
    </Card>
  );
};