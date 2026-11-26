import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "dark");
  const logoSrc = theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  useEffect(() => {
    const root = document.documentElement;
    const favicons = document.querySelectorAll("link[rel*='icon']");
    if (theme === "dark") {
      root.classList.add("dark");
      favicons.forEach((el) => {
        el.href = "/logo-dark.png";
      });
    } else {
      root.classList.remove("dark");
      favicons.forEach((el) => {
        el.href = "/logo-light.png";
      });
    }
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, logoSrc }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

