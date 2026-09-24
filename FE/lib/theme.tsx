"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

// Dark mode is intentionally scoped to authenticated user/admin areas.
function isThemeScope(path?: string) {
  const currentPath = path || (typeof window !== "undefined" ? window.location.pathname : "");
  return /^\/user(?:\/|$)/.test(currentPath) || /^\/admin(?:\/|$)/.test(currentPath);
}

function applyTheme(theme: Theme, path?: string) {
  const enabled = theme === "dark" && isThemeScope(path);
  document.documentElement.classList.toggle("dark", enabled);
  document.documentElement.style.colorScheme = enabled ? "dark" : "light";
}

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("app-theme") as Theme | null;
      const settings = localStorage.getItem("appSettings");
      const fromSettings = settings ? JSON.parse(settings)?.theme : null;
      const initial =
        saved === "dark" || saved === "light"
          ? saved
          : fromSettings === "dark" || fromSettings === "light"
            ? fromSettings
            : window.matchMedia?.("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
      setThemeState(initial);
      applyTheme(initial);
    } catch {}
  }, []);

  useEffect(() => {
    applyTheme(theme, pathname);
  }, [pathname, theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("app-theme", t);
      const raw = localStorage.getItem("appSettings");
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem("appSettings", JSON.stringify({ ...parsed, theme: t }));
    } catch {}
    applyTheme(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("app-theme", next);
        const raw = localStorage.getItem("appSettings");
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem("appSettings", JSON.stringify({ ...parsed, theme: next }));
      } catch {}
      applyTheme(next);
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
