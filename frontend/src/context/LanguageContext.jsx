import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('mygold_lang');
      return saved === 'ta' || saved === 'en' ? saved : 'en';
    } catch (e) {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'ta' ? 'ta' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('mygold_lang', validLang);
      document.documentElement.lang = validLang;
    } catch (e) {
      console.warn('Could not save language preference to localStorage:', e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch (e) {}
  }, [language]);

  const t = (key, params = {}) => {
    const langDict = translations[language] || translations['en'];
    let text = langDict[key] ?? translations['en'][key] ?? key;

    if (typeof text === 'string' && params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isTamil: language === 'ta',
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
