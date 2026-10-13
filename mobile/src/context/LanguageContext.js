import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../utils/translations';

const LANGUAGE_STORAGE_KEY = 'mygold_lang';

export const LanguageContext = createContext({
  language: 'en',
  isTamil: false,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  // Load saved language on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'ta' || saved === 'en') {
          setLanguageState(saved);
        }
      } catch {
        // Fallback to default 'en'
      }
    };
    loadSavedLanguage();
  }, []);

  const setLanguage = useCallback(async (lang) => {
    const validLang = lang === 'ta' ? 'ta' : 'en';
    setLanguageState(validLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
    } catch {
      // Non-fatal storage error
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  }, [language, setLanguage]);

  const t = useCallback(
    (key, params = {}) => {
      const langDict = translations[language] || translations.en;
      let text = langDict?.[key] ?? translations.en?.[key] ?? key;

      if (typeof text === 'string' && params && typeof params === 'object') {
        Object.keys(params).forEach((paramKey) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
        });
      }

      return text;
    },
    [language]
  );

  const value = {
    language,
    isTamil: language === 'ta',
    setLanguage,
    toggleLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
