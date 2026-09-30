import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { Platform } from 'react-native';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof translations)['vi'];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: translations.vi,
});

const LANG_KEY = 'monett_language';

// Helper: lưu ngôn ngữ vào storage phù hợp
const saveLang = async (lang: Language) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    localStorage.setItem(LANG_KEY, lang);
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      console.warn('AsyncStorage setItem error:', e);
    }
  }
};

// Helper: đọc ngôn ngữ từ storage
const loadLang = async (): Promise<Language | null> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const saved = localStorage.getItem(LANG_KEY) as Language;
    return (saved === 'vi' || saved === 'en') ? saved : null;
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const saved = await AsyncStorage.getItem(LANG_KEY);
      return (saved === 'vi' || saved === 'en') ? (saved as Language) : null;
    } catch (e) {
      console.warn('AsyncStorage getItem error:', e);
      return null;
    }
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    loadLang().then((saved) => {
      if (saved) setLanguageState(saved);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLang(lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
