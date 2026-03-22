import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

const UIContext = createContext(null);
const THEME_STORAGE_KEY = "dogscan_theme";
const DARK_MODE_PROTECTED_PATHS = [
  "/dashboard",
  "/assistant",
  "/history",
  "/profile",
];

function isProtectedThemeRoute(pathname) {
  if (typeof pathname !== "string") return false;
  if (pathname.startsWith("/admin")) return true;
  return DARK_MODE_PROTECTED_PATHS.some((path) => pathname === path);
}

function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
  } catch {
    // Ignore storage access issues.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const UIProvider = ({ children }) => {
  const location = useLocation();
  const [isUserSidebarOpen, setIsUserSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const isDarkModeAvailable = isProtectedThemeRoute(location.pathname);
  const resolvedTheme = isDarkModeAvailable ? theme : "light";

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access issues.
    }
  }, [resolvedTheme, theme]);

  const value = useMemo(
    () => ({
      isUserSidebarOpen,
      setIsUserSidebarOpen,
      openUserSidebar: () => setIsUserSidebarOpen(true),
      closeUserSidebar: () => setIsUserSidebarOpen(false),
      toggleUserSidebar: () => setIsUserSidebarOpen((prev) => !prev),
      theme,
      resolvedTheme,
      isDarkModeAvailable,
      setTheme,
      toggleTheme: () =>
        setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [isUserSidebarOpen, isDarkModeAvailable, resolvedTheme, theme]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within UIProvider");
  }
  return context;
};
