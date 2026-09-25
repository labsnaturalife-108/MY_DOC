"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, translations } from "@/locales/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations.ru;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("ru");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mydoc_language") as Language | null;
      if (stored && (stored === "ru" || stored === "en")) {
        setLanguageState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      // Fallback
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("mydoc_language", lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === "ru" ? "en" : "ru";
    setLanguage(nextLang);
  };

  const currentTranslations = translations[language] || translations.ru;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: currentTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
