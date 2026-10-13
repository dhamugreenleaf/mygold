import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Toast from '../components/common/Toast';

export const ToastContext = createContext({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  hideToast: () => {},
});

// Singleton dispatcher for calling outside of React hooks if needed
let globalToastHandler = null;

export const toast = {
  success: (message, title = 'Success') => {
    if (globalToastHandler?.showSuccess) {
      globalToastHandler.showSuccess(message, title);
    } else {
      console.log(`[Toast:Success] ${title}: ${message}`);
    }
  },
  error: (message, title = 'Error') => {
    if (globalToastHandler?.showError) {
      globalToastHandler.showError(message, title);
    } else {
      console.warn(`[Toast:Error] ${title}: ${message}`);
    }
  },
  info: (message, title = 'Notice') => {
    if (globalToastHandler?.showInfo) {
      globalToastHandler.showInfo(message, title);
    } else {
      console.log(`[Toast:Info] ${title}: ${message}`);
    }
  },
  hide: () => {
    if (globalToastHandler?.hideToast) {
      globalToastHandler.hideToast();
    }
  },
};

export const ToastProvider = ({ children }) => {
  const [toastState, setToastState] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    duration: 3500,
  });

  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback(({ type = 'success', title = '', message = '', duration = 3500 }) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToastState({
      visible: true,
      type,
      title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notice'),
      message: message || '',
      duration,
    });

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }
  }, [hideToast]);

  const showSuccess = useCallback((message, title = 'Success') => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((message, title = 'Error') => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const showInfo = useCallback((message, title = 'Notice') => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  // Keep singleton handler fresh
  globalToastHandler = { showToast, showSuccess, showError, showInfo, hideToast };

  // Intercept Alert.alert on Web so NO native browser popup (window.alert) ever appears!
  useEffect(() => {
    if (Platform.OS === 'web') {
      const originalAlert = Alert.alert;

      Alert.alert = (title, message, buttons) => {
        // If buttons has cancel/confirm actions
        if (Array.isArray(buttons) && buttons.length > 1) {
          // Fall back to original or execute first button
          return originalAlert(title, message, buttons);
        }

        const lowerTitle = (title || '').toLowerCase();
        const content = message || title || '';
        const header = message ? title : '';

        if (lowerTitle.includes('error') || lowerTitle.includes('failed')) {
          showError(content, header || 'Error');
        } else if (
          lowerTitle.includes('success') ||
          lowerTitle.includes('updated') ||
          lowerTitle.includes('saved') ||
          lowerTitle.includes('removed')
        ) {
          showSuccess(content, header || 'Success');
        } else {
          showInfo(content, header || 'Notice');
        }

        // If a single OK button was provided with an onPress callback, call it
        if (Array.isArray(buttons) && buttons.length === 1 && typeof buttons[0]?.onPress === 'function') {
          buttons[0].onPress();
        }
      };

      return () => {
        Alert.alert = originalAlert;
      };
    }
  }, [showSuccess, showError, showInfo]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, hideToast }}>
      {children}
      <Toast
        visible={toastState.visible}
        type={toastState.type}
        title={toastState.title}
        message={toastState.message}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastContext;
