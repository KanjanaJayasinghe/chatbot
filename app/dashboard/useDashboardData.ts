"use client";
/**
 * Dashboard Data Context
 * ─────────────────────────────────────────────────────────────────────────────
 * Shares the result of a single /api/dashboard fetch (which runs all 5 AI/ML
 * models server-side) with every child page via React Context.
 *
 * DashboardProvider (JSX component) lives in layout.tsx (a .tsx file).
 * This file only exports the context, types, and the useDashboardData() hook.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DashboardData = Record<string, any>;

export interface DashboardContextValue {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const DashboardContext = createContext<DashboardContextValue>({
  data: null,
  loading: true,
  error: null,
  reload: () => {},
});

// ── State factory — used by DashboardProvider in layout.tsx ──────────────────
export function useDashboardState(): DashboardContextValue & { children?: ReactNode } {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, reload };
}

// ── Consumer hook — used by all 5 dashboard page components ──────────────────
export function useDashboardData(): DashboardContextValue {
  return useContext(DashboardContext);
}
