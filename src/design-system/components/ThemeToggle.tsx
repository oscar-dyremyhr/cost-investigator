"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "cost-investigator-theme";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getTheme = () => document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
const getServerTheme = () => "light" as const;

export function setTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* Theme remains available for this page load. */ }
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      data-testid="theme-toggle"
      className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:border-brand hover:text-brand"
    >
      {theme === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}
