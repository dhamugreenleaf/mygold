import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Check if app is already running as an installed standalone PWA
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }
  }, []);

  // Suppress browser's install popup completely & track network status
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      return false;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallModalOpen(false);
      toast.success('Aurum Vault installed successfully! 🪙', { duration: 4500 });
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
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsInstallModalOpen(false);
  }, []);

  // Click install icon → show our custom in-app modal only
  const promptInstall = useCallback(() => {
    setIsInstallModalOpen(true);
  }, []);

  // User confirmed install in our modal → close modal & show success
  const executeInstall = useCallback(async () => {
    setIsInstallModalOpen(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      toast.success('Aurum Vault app added! You can pin this tab or bookmark it for quick access. 🪙', {
        duration: 5000,
      });
    }
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isOnline,
        isInstallModalOpen,
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
