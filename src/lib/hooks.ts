/**
 * Small reusable React hooks.
 */
import { useEffect, useState } from "react";

/**
 * Shows a short loading state when a page opens (and whenever `key` changes),
 * so loading skeletons can be seen and tested in the prototype.
 * In Milestone 5 this is replaced by the real API request state.
 */
export function useSimulatedLoading(ms = 450, key: unknown = null): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms, key]);
  return loading;
}

/** The value, updated only after it stops changing for `delay` ms (for search-as-you-type). */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Sets the browser tab title: "Explore stores · DealFinder". */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · DealFinder` : "DealFinder";
  }, [title]);
}

/** True when the screen is at least `minWidth` pixels wide (Tailwind's lg = 1024). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
