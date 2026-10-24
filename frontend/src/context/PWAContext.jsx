import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(() => (typeof window !== 'undefined' ? window.deferredPwaPrompt || null : null));

  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const isRunningStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }, []);

  // Check whether the app is currently running as installed standalone app or in web browser
  const checkInstallStatus = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 1. If running in standalone window (installed PWA app window), hide the install button
    if (isRunningStandalone()) {
      setIsInstalled(true);
      return;
    }

    // 2. In normal web browser (mobile Chrome, Safari, etc.), always show the install button
    setIsInstalled(false);
  }, [isRunningStandalone]);

  // Initial detection & event listeners
  useEffect(() => {
    checkInstallStatus();

    // Listen to display-mode changes (e.g. launched in standalone vs browser tab)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsInstalled(true);
      } else {
        checkInstallStatus();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    // When the browser window regains focus or visibility (e.g. after uninstalling outside browser)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInstallStatus();
      }
    };

    window.addEventListener('focus', checkInstallStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);

      // Browser only fires beforeinstallprompt if the PWA is NOT installed.
      // If the app was uninstalled, this immediately reveals the install button again.
      if (!isRunningStandalone()) {
        setIsInstalled(false);
      }
      return false;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallModalOpen(false);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      toast.success('MyGold installed successfully! 🪙', { duration: 4500 });
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Online mode restored. Syncing live bullion quotes...', { id: 'pwa-network' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. Using local cached vault ledger.', {
        icon: '📡',
        id: 'pwa-network',
        duration: 4000,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      window.removeEventListener('focus', checkInstallStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInstallStatus, isRunningStandalone]);

  const closeInstallModal = useCallback(() => {
    setIsInstallModalOpen(false);
  }, []);

  // Click install icon → show our custom in-app modal
  const promptInstall = useCallback(() => {
    setIsInstallModalOpen(true);
  }, []);

  // User confirmed install in our modal → trigger native prompt or platform guide
  const executeInstall = useCallback(async () => {
    if (deferredPrompt) {
      setIsInstallModalOpen(false);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          window.deferredPwaPrompt = null;
        }
      } catch (err) {
        console.warn('[PWA Prompt Warning]:', err);
      }
    } else if (isIOS) {
      // Keep modal open so iOS instructions can be read
      toast('Tap the Share button ⎋ below, then "Add to Home Screen" ➕', {
        icon: '📲',
        duration: 6000,
      });
    } else {
      setIsInstallModalOpen(false);
      toast('Click "Install" or "Open in app" in your browser address bar (top right) ↗️', {
        icon: '📲',
        duration: 6000,
      });
    }
  }, [deferredPrompt, isIOS]);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isOnline,
        isInstallModalOpen,
        isIOS,
        hasPrompt: !!deferredPrompt,
        closeInstallModal,
        promptInstall,
        executeInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    return {
      isInstalled: false,
      isOnline: true,
      isInstallModalOpen: false,
      closeInstallModal: () => {},
      promptInstall: () => {},
      executeInstall: () => {},
    };
  }
  return context;
};

export default PWAContext;
