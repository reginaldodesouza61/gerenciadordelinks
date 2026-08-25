import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function registerServiceWorker(onUpdateFound?: () => void) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for service worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available and will be used when all tabs are closed
                  console.log('PWA: Nova versão disponível.');
                  onUpdateFound?.();
                } else {
                  // Content is cached for offline use
                  console.log('PWA: Conteúdo armazenado para uso offline.');
                }
              }
            });
          });
        })
        .catch((error) => {
          console.warn('PWA: Falha ao registrar Service Worker:', error);
        });
    });
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkIsInstalled = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(Boolean(isStandalone));
    };

    checkIsInstalled();

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Capture appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast.success('Atlas Workspace instalado com sucesso no seu dispositivo!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register Service Worker and track updates
    registerServiceWorker(() => {
      setHasUpdate(true);
      toast.info('Nova versão do Atlas Workspace disponível!', {
        action: {
          label: 'Atualizar',
          onClick: () => {
            window.location.reload();
          },
        },
        duration: 8000,
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        toast.info(
          'Para instalar no iPhone/iPad: Toque no botão Compartilhar (quadrado com seta para cima) e selecione "Adicionar à Tela de Início".',
          { duration: 8000 }
        );
        return 'ios-manual';
      }
      return 'unavailable';
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        return 'accepted';
      } else {
        return 'dismissed';
      }
    } catch (err) {
      console.warn('Erro ao disparar prompt de instalação PWA:', err);
      return 'error';
    }
  }, [deferredPrompt, isIOS]);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt) || (isIOS && !isInstalled),
    hasPrompt: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    hasUpdate,
    installApp,
    applyUpdate,
  };
}
