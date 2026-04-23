"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  DashboardContext,
  useDashboardState,
  useDashboardData,
} from "./useDashboardData";

function DashboardProvider({ children }: { children: React.ReactNode }) {
  const state = useDashboardState();
  useEffect(() => { state.reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return <DashboardContext.Provider value={state}>{children}</DashboardContext.Provider>;
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { href: "/dashboard/global",    label: "Overview",      badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>),
  },
  { href: "/dashboard/global",    label: "Dashboard",     badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>),
  },
  { href: "/dashboard/simulation", label: "Simulation",   badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>),
  },
  { href: "/dashboard/temporal",   label: "Predictions",  badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>),
  },
  { href: "/dashboard/spatial",    label: "Interventions", badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>),
  },
  { href: "/dashboard/drivers",    label: "Monitoring",   badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>),
  },
  { href: "#", label: "Reports", badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>),
  },
  { href: "#", label: "Alerts", badge: "3",
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>),
  },
  { href: "#", label: "Settings", badge: null,
    icon: (<svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>),
  },
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard/global":     "Global Overview",
  "/dashboard/simulation": "Decision Support & Simulation",
  "/dashboard/temporal":   "Temporal Forecasting",
  "/dashboard/spatial":    "Spatial Risk Intelligence",
  "/dashboard/drivers":    "Environmental Drivers",
};

// ── Top Nav Bar ───────────────────────────────────────────────────────────────
function TopNavBar() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useDashboardData();
  const pageLabel = PAGE_LABELS[pathname] ?? "Dashboard";

  return (
    <header
      className="h-[52px] shrink-0 flex items-center px-5 gap-4 z-30"
      style={{
        background: isDark ? "#040d1a" : "#ffffff",
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4.5 h-4.5 w-[18px] h-[18px]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div className="leading-none hidden sm:block">
          <p style={{ color: isDark ? "#64748b" : "#94a3b8" }} className="text-[9px] font-semibold tracking-widest uppercase">Sri Lanka · Coastal Management</p>
          <p style={{ color: isDark ? "#f1f5f9" : "#1e293b" }} className="text-[13px] font-bold">Coastal Data Dashboard</p>
        </div>
      </div>

      {/* Current page */}
      <div
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ml-2"
        style={{
          background: isDark ? "rgba(20,184,166,0.12)" : "#f0fdfa",
          border: isDark ? "1px solid rgba(20,184,166,0.25)" : "1px solid #99f6e4",
          color: isDark ? "#5eead4" : "#0f766e",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
        {pageLabel}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* Data info */}
        <span className="hidden lg:flex items-center gap-1.5 text-xs" style={{ color: isDark ? "#475569" : "#94a3b8" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          2000–2026 · 2,000 records
        </span>

        {/* Live */}
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
          style={{
            background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
            color: isDark ? "#cbd5e1" : "#475569",
          }}
        >
          {isDark ? (
            <><svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/></svg>Day Mode</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/></svg>Night Mode</>
          )}
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center select-none shrink-0">AD</div>
      </div>
    </header>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function DashboardSidebar() {
  const pathname = usePathname();
  const { loading, error, reload, isDark } = useDashboardData();

  const sidebarBg    = isDark ? "#040d1a"                          : "#ffffff";
  const sidebarBdr   = isDark ? "rgba(255,255,255,0.05)"           : "#e2e8f0";
  const dividerClr   = isDark ? "rgba(255,255,255,0.05)"           : "#f1f5f9";
  const logoTitle    = isDark ? "#f1f5f9"                          : "#1e293b";
  const logoSub      = isDark ? "#475569"                          : "#64748b";

  return (
    <aside
      className="w-[225px] flex flex-col shrink-0 min-h-screen"
      style={{ background: sidebarBg, borderRight: `1px solid ${sidebarBdr}` }}
    >
      {/* Logo */}
      <div className="px-5 pt-4 pb-3.5" style={{ borderBottom: `1px solid ${dividerClr}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold leading-snug" style={{ color: logoTitle }}>Sri Lanka</p>
            <p className="text-[11px] leading-snug" style={{ color: logoSub }}>Coastal Management</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-4 py-2" style={{ borderBottom: `1px solid ${dividerClr}` }}>
        {loading && (
          <span className="text-xs text-yellow-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Running AI models…
          </span>
        )}
        {error && (
          <div className="text-xs text-red-400">
            ⚠ {error}{" "}
            <button onClick={reload} className="underline hover:text-red-300">Retry</button>
          </div>
        )}
        {!loading && !error && (
          <span className="text-xs text-green-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            All models ready
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon, badge }) => {
          const active = href !== "#" && pathname === href && label !== "Dashboard";
          return (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={active
                ? isDark
                  ? { background: "rgba(20,184,166,0.15)", color: "#2dd4bf", border: "1px solid rgba(20,184,166,0.3)" }
                  : { background: "#0d9488", color: "#ffffff" }
                : isDark
                  ? { color: "#64748b" }
                  : { color: "#64748b" }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "#f8fafc";
                  (e.currentTarget as HTMLAnchorElement).style.color = isDark ? "#cbd5e1" : "#1e293b";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = isDark ? "#64748b" : "#64748b";
                }
              }}
            >
              <span style={{ color: active ? (isDark ? "#2dd4bf" : "#ffffff") : (isDark ? "#475569" : "#94a3b8") }}>
                {icon}
              </span>
              <span>{label}</span>
              {badge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer card */}
      <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${dividerClr}` }}>
        <div
          className="rounded-xl p-4"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #0d2d3a 0%, #0f3d2e 100%)"
              : "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
            border: isDark ? "1px solid rgba(20,184,166,0.2)" : "none",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">🌊</span>
            <span className="text-sm font-semibold text-white">Coastal Guardian</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: isDark ? "#5eead4" : "#ccfbf1" }}>
            Protecting our coastline for a sustainable future
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: isDark ? "#475569" : "#94a3b8" }}>Need Help?</p>
          <Link href="/" className="text-xs font-medium hover:underline" style={{ color: isDark ? "#2dd4bf" : "#0d9488" }}>
            Contact Support
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ── Layout root ───────────────────────────────────────────────────────────────
function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isDark } = useDashboardData();
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: isDark ? "#060d1f" : "#f8fafc", color: isDark ? "#f1f5f9" : "#1e293b" }}
    >
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
