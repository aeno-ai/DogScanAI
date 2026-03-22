import { Moon, Sun } from "lucide-react";
import { useUI } from "../../context/UIContext";

const ThemeToggle = ({
  compact = false,
  className = "",
  ariaLabel,
}) => {
  const { isDarkModeAvailable, resolvedTheme, toggleTheme } = useUI();
  const isDark = resolvedTheme === "dark";

  if (!isDarkModeAvailable) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={ariaLabel || (isDark ? "Switch to light mode" : "Switch to dark mode")}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${className}`.trim()}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
};

export default ThemeToggle;
