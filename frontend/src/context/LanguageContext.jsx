import { createContext, useContext, useState, useCallback } from "react";
import { STRINGS } from "@/lib/i18n";

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("gzb_lang") || "hi");

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next = prev === "hi" ? "en" : "hi";
      localStorage.setItem("gzb_lang", next);
      return next;
    });
  }, []);

  const t = useCallback((key) => STRINGS[lang][key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
