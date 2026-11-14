/**
 * Dark / light colour theme. Dark is the default (matches the Milestone 3 prototype).
 * The choice is saved in localStorage and applied as the `light` class on <html>.
 */
import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const KEY = "dealfinder.theme";
const listeners = new Set<() => void>();

const read = (): Theme => (document.documentElement.classList.contains("light") ? "light" : "dark");

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle("light", theme === "light");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f7fb" : "#050816");
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "dark" as Theme,
  );
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark")];
}
