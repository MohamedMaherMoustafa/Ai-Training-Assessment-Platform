import { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const isRtl = lang === "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    i18n.changeLanguage(lang);
    localStorage.setItem("app_lang", lang);
  }, [lang, i18n]);

  const toggleLang = () => setLang((prev) => (prev === "ar" ? "en" : "ar"));
  const isRtl = lang === "ar";

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, isRtl }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

