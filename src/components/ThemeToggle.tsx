import { useTheme } from "@/hooks/useTheme";
import { MoonIcon } from "./icons/MoonIcon";
import { SunIcon } from "./icons/SunIcon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="hover:bg-muted/50 focus:ring-ring rounded-md p-2 transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <MoonIcon className="text-muted-foreground h-5 w-5" />
      ) : (
        <SunIcon className="text-muted-foreground h-5 w-5" />
      )}
    </button>
  );
}
