"use client";
/**
 * Dashboard Shell Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps every /dashboard/* page in:
 *   1. DashboardProvider  — fetches /api/dashboard once and shares data via
 *      React Context (K-Means, Random Forest, ARIMA, Isolation Forest, MLR).
 *   2. Sidebar navigation — links to all 5 AI-model pages.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  DashboardContext,
  useDashboardState,
  useDashboardData,
} from "./useDashboardData";

// ── DashboardProvider ─────────────────────────────────────────────────────────
// Fetches /api/dashboard ONCE when the layout mounts.
// All 5 child pages share this single API call via React Context.
function DashboardProvider({ children }: { children: React.ReactNode }) {
  const state = useDashboardState();

  useEffect(() => {
    state.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — intentionally no dep on reload (stable ref)

  return (
    <DashboardContext.Provider value={state}>
      {children}
    </DashboardContext.Provider>
  );
}

// ── Page definitions ──────────────────────────────────────────────────────────
const NAV = [
  {
    href: "/dashboard/global",
    label: "Global Overview",
    icon: "🌍",
    sub: "K-Means · Isolation Forest",
    model: "Page 1",
  },
  {
    href: "/dashboard/spatial",
    label: "Spatial Risk",
    icon: "🗺️",
    sub: "K-Means · Linear Regression",
    model: "Page 2",
  },
  {
    href: "/dashboard/temporal",
    label: "Temporal Forecast",
    icon: "📈",
    sub: "ARIMA · Seasonal Decomp",
    model: "Page 3",
  },
  {
    href: "/dashboard/drivers",
    label: "Env. Drivers",
    icon: "🌡️",
    sub: "Random Forest · SHAP",
    model: "Page 4",
  },
  {
    href: "/dashboard/simulation",
    label: "Decision Support",
    icon: "🧠",
    sub: "Multiple Lin. Regression",
    model: "Page 5",
  },
];

// ── Sidebar (inner client component) ─────────────────────────────────────────
function DashboardSidebar() {
  const pathname = usePathname();
  const { loading, error, reload } = useDashboardData();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 min-h-screen">
      {/* Branding */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🪸</span>
          <span className="font-bold text-lg text-cyan-400">CoralAI</span>
        </div>
        <p className="text-xs text-gray-400">Reef Intelligence Dashboard</p>
        <p className="text-xs text-gray-600 mt-1">5 AI/ML Models</p>
      </div>

      {/* Data-load status badge */}
      <div className="px-4 py-2 border-b border-gray-800">
        {loading && (
          <span className="text-xs text-yellow-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Running AI models…
          </span>
        )}
        {error && (
          <div className="text-xs text-red-400">
            <span>⚠ {error}</span>
            <button
              onClick={reload}
              className="ml-2 underline text-red-300 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            All models ready
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-all ${
                active
                  ? "bg-cyan-900/60 border border-cyan-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <div className={`text-sm font-medium ${active ? "text-cyan-300" : ""}`}>
                  {item.label}
                </div>
                <div className="text-xs text-gray-500">{item.sub}</div>
              </div>
              <span className="ml-auto shrink-0 text-xs text-gray-600 mt-0.5">
                {item.model}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <p className="text-xs text-gray-600">
          Models: K-Means++, Random Forest, ARIMA, Isolation Forest, MLR
        </p>
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
          ← Back to Main Dashboard
        </Link>
      </div>
    </aside>
  );
}

// ── Layout root ───────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // DashboardProvider fetches /api/dashboard once; all 5 pages read from context
    <DashboardProvider>
      <div className="flex min-h-screen bg-gray-950 text-white">
        <DashboardSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </DashboardProvider>
  );
}
