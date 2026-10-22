import React, { createContext, useContext, useState } from "react";
import { vi, type TranslationKey } from "./vi";
import { en } from "./en";

export type Language = "vi" | "en";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const translations: Record<Language, Record<TranslationKey, string>> = {
  vi,
  en,
};

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => en[key] || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const switched = localStorage.getItem("sabibeco_en_default_v2");
      if (!switched) {
        localStorage.setItem("sabibeco_en_default_v2", "true");
        localStorage.setItem("sabibeco_lang", "en");
        return "en";
      }
      const saved = localStorage.getItem("sabibeco_lang");
      if (saved === "vi" || saved === "en") return saved;
    } catch {}
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("sabibeco_lang", lang);
    } catch {}
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] || translations.vi;
    return langDict[key] || fallback || vi[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
