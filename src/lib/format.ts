/**
 * Small formatting and validation helpers shared by every page.
 * Pure functions only: no React, no state.
 */

const DAY = 86_400_000;

/** Join class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(time: number | Date = Date.now()): string {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as YYYY-MM-DD. */
export const todayISO = (): string => toISODate(Date.now());

/** Add (or subtract) whole days to a YYYY-MM-DD date. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d).getTime() + days * DAY);
}

/** "9 Dec 2026" from a timestamp or a YYYY-MM-DD string. */
export function formatDate(value: number | string): string {
  let date: Date;
  if (typeof value === "string") {
    const [y, m, d] = value.split("-").map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(value);
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "Just now", "5 min ago", "3 days ago", "2 weeks ago" or a date. */
export function timeAgo(time: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - time) / 1000));
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  const days = Math.round(s / 86_400);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return formatDate(time);
}

/** Whole days from today until a YYYY-MM-DD date (negative when in the past). */
export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = todayISO().split("-").map(Number);
  const today = new Date(ty, tm - 1, td).getTime();
  return Math.round((target - today) / DAY);
}

/** "1 store", "4 stores". */
export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? word : pluralWord}`;
}

/** 2,100 */
export const formatNumber = (n: number): string => n.toLocaleString("en-US");

/** Compact numbers for dashboards: 12.4k */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** Initials for avatars and logo tiles: "Velvet & Vine" -> "V&". */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** Website host without "www.": "https://www.urbannest.sa/x" -> "urbannest.sa". */
export function hostname(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** True for a well-formed https:// URL with a real-looking host. */
export function isValidWebsite(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname.includes(".") && !/\s/.test(url);
  } catch {
    return false;
  }
}

/** Basic e-mail format check. */
export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

/** Password rules used by sign up and password change (FR01). */
export function passwordChecks(pw: string): Array<{ ok: boolean; label: string }> {
  return [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: "Upper and lower case letters" },
    { ok: /\d/.test(pw), label: "A number" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "A symbol such as # or !" },
  ];
}

export const isStrongPassword = (pw: string): boolean => passwordChecks(pw).every((c) => c.ok);

/** Reviews may not contain links, e-mail addresses or phone numbers (W05-2). */
export const containsContactDetails = (text: string): boolean =>
  /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|sa|biz|io|co)\b)/i.test(text) ||
  /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) ||
  /(\+?\d[\d\s().-]{7,}\d)/.test(text);

/** Levenshtein edit distance, used for "Did you mean ...?" search suggestions. */
export function editDistance(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}
