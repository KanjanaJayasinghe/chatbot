"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  DashboardContext,
  useDashboardState,
  useDashboardData,
} from "./useDashboardData";

type LayoutProps = Readonly<{ children: React.ReactNode }>;

type NavItem = {
  href: string;
  label: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
};

type SidebarThemeTokens = {
  sidebarBg: string;
  sidebarBdr: string;
  dividerClr: string;
  logoTitle: string;
  logoSub: string;
  navCaption: string;
  baseCardBg: string;
  baseCardBorder: string;
  iconTileBg: string;
  iconTileBorder: string;
  statusBg: string;
  statusBorder: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
  iconBackground: string;
  iconColor: string;
  iconBoxShadow: string;
  titleColor: string;
  descriptionColor: string;
  indicatorGlow: string;
};

const OCEAN_BG_IMAGE = 'url("/Beautiful%20Coral%20Reef%20Ocean%20Background.png")';

function DashboardProvider({ children }: LayoutProps) {
  const state = useDashboardState();
  const { reload } = state;
  useEffect(() => {
    reload();
  }, [reload]);
  return <DashboardContext.Provider value={state}>{children}</DashboardContext.Provider>;
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  {
    href: "/dashboard/global",
    label: "Islandwide View",
    description: "Overall reef risk summary",
    accent: "#0EA5E9",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.45 3.4 5.63 3.4 9S14.2 18.55 12 21M12 3C9.8 5.45 8.6 8.63 8.6 12S9.8 18.55 12 21" />
      </svg>
    ),
  },
  {
    href: "/dashboard/spatial",
    label: "Reef Map",
    description: "Where risk is highest",
    accent: "#2563EB",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M12 21s6-5.686 6-11a6 6 0 10-12 0c0 5.314 6 11 6 11z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/temporal",
    label: "Future Outlook",
    description: "Expected bleaching trend",
    accent: "#3B82F6",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M4 16l5-5 4 4 7-7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M15 8h5v5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/drivers",
    label: "Bleaching Causes",
    description: "What drives risk most",
    accent: "#0F766E",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M12 6v4m0 4v4M6 12h4m4 0h4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M5 6h2m10 0h2M5 18h2m10 0h2M8 4v4m8-4v4M8 16v4m8-4v4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/simulation",
    label: "Action Scenarios",
    description: "Test what-if conditions",
    accent: "#0891B2",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M6 6h4v4H6V6zm8 0h4v4h-4V6zM6 14h4v4H6v-4zm8-2l4 6h-4l-4-6h4z" />
      </svg>
    ),
  },
];

function getSidebarThemeTokens(isDark: boolean): SidebarThemeTokens {
  return {
    sidebarBg: isDark
      ? "linear-gradient(180deg, #031018 0%, #020617 58%, #010409 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,251,255,0.96) 58%, rgba(241,248,255,0.98) 100%)",
    sidebarBdr: isDark ? "rgba(94,234,212,0.14)" : "rgba(191,219,254,0.92)",
    dividerClr: isDark ? "rgba(148,163,184,0.14)" : "rgba(191,219,254,0.74)",
    logoTitle: isDark ? "#F8FAFC" : "#193765",
    logoSub: isDark ? "#8AA3B8" : "#6884A6",
    navCaption: isDark ? "#78A7C7" : "#73A8E4",
    baseCardBg: isDark ? "rgba(15,23,42,0.62)" : "rgba(255,255,255,0.82)",
    baseCardBorder: isDark ? "rgba(148,163,184,0.12)" : "rgba(203,225,246,0.92)",
    iconTileBg: isDark ? "rgba(15,118,110,0.16)" : "linear-gradient(180deg, #F7FAFF 0%, #EDF5FF 100%)",
    iconTileBorder: isDark ? "rgba(45,212,191,0.16)" : "rgba(214,228,247,0.96)",
    statusBg: isDark ? "rgba(8,145,178,0.12)" : "rgba(236,253,245,0.9)",
    statusBorder: isDark ? "rgba(34,211,238,0.18)" : "#99F6E4",
    cardBackground: "",
    cardBorder: "",
    cardShadow: "",
    iconBackground: "",
    iconColor: "",
    iconBoxShadow: "",
    titleColor: "",
    descriptionColor: "",
    indicatorGlow: "",
  };
}

function getActiveNavItemTokens(item: NavItem, isDark: boolean, theme: SidebarThemeTokens): SidebarThemeTokens {
  return {
    ...theme,
    cardBackground: isDark
      ? "linear-gradient(135deg, rgba(8,145,178,0.28) 0%, rgba(15,118,110,0.18) 100%)"
      : "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
    cardBorder: isDark ? "1px solid rgba(103,232,249,0.34)" : "1px solid rgba(96,165,250,0.55)",
    cardShadow: isDark ? "0 18px 40px rgba(8,145,178,0.16)" : "0 18px 36px rgba(59,130,246,0.14)",
    iconBackground: isDark
      ? `linear-gradient(135deg, ${item.accent}, #0F766E)`
      : `linear-gradient(135deg, ${item.accent}, #1D4ED8)`,
    iconColor: isDark ? "#F8FAFC" : "#FFFFFF",
    iconBoxShadow: isDark
      ? `0 10px 24px color-mix(in srgb, ${item.accent} 28%, transparent)`
      : `0 10px 24px color-mix(in srgb, ${item.accent} 24%, transparent)`,
    titleColor: isDark ? "#F8FAFC" : "#16325C",
    descriptionColor: isDark ? "#B7F3EA" : "#537198",
    indicatorGlow: `0 0 0 6px color-mix(in srgb, ${item.accent} 18%, transparent)`,
  };
}

function getInactiveNavItemTokens(item: NavItem, isDark: boolean, theme: SidebarThemeTokens): SidebarThemeTokens {
  return {
    ...theme,
    cardBackground: theme.baseCardBg,
    cardBorder: `1px solid ${theme.baseCardBorder}`,
    cardShadow: "none",
    iconBackground: theme.iconTileBg,
    iconColor: isDark ? "#7DD3FC" : item.accent,
    iconBoxShadow: "none",
    titleColor: isDark ? "#E2E8F0" : "#29486E",
    descriptionColor: isDark ? "#7C93A8" : "#6B85A6",
    indicatorGlow: "none",
  };
}

type TopBarTheme = {
  shellBorder: string;
  shellBg: string;
  overlay: string;
  pillBg: string;
  pillBorder: string;
  pillShadow: string;
  pillText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  iconColor: string;
  userBg: string;
  userBorder: string;
  userShadow: string;
  buttonStyle: React.CSSProperties;
};

function getDarkTopBarTheme(): TopBarTheme {
  return {
    shellBorder: "1px solid rgba(255,255,255,0.08)",
    shellBg: "linear-gradient(180deg, rgba(4,12,24,0.96) 0%, rgba(3,9,18,0.94) 100%)",
    overlay: `linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0.45)), ${OCEAN_BG_IMAGE}`,
    pillBg: "rgba(15,23,42,0.7)",
    pillBorder: "1px solid rgba(148,163,184,0.18)",
    pillShadow: "none",
    pillText: "#F8FAFC",
    inputBg: "rgba(15,23,42,0.66)",
    inputBorder: "1px solid rgba(148,163,184,0.18)",
    inputText: "#E2E8F0",
    iconColor: "#94A3B8",
    userBg: "rgba(15,23,42,0.7)",
    userBorder: "1px solid rgba(148,163,184,0.16)",
    userShadow: "none",
    buttonStyle: {
      width: 40,
      height: 40,
      borderRadius: 999,
      border: "1px solid rgba(148,163,184,0.18)",
      background: "rgba(15,23,42,0.64)",
      color: "#CFEAFC",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "none",
    },
  };
}

function getLightTopBarTheme(): TopBarTheme {
  return {
    shellBorder: "1px solid rgba(191,219,254,0.88)",
    shellBg: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(246,251,255,0.92) 100%)",
    overlay: `linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0.45)), ${OCEAN_BG_IMAGE}`,
    pillBg: "rgba(255,255,255,0.86)",
    pillBorder: "1px solid rgba(191,219,254,0.96)",
    pillShadow: "0 12px 30px rgba(59,130,246,0.08)",
    pillText: "#1972C8",
    inputBg: "rgba(255,255,255,0.82)",
    inputBorder: "1px solid rgba(219,234,254,0.96)",
    inputText: "#35557B",
    iconColor: "#4B6FA2",
    userBg: "rgba(255,255,255,0.88)",
    userBorder: "1px solid rgba(191,219,254,0.94)",
    userShadow: "0 12px 28px rgba(59,130,246,0.08)",
    buttonStyle: {
      width: 40,
      height: 40,
      borderRadius: 999,
      border: "1px solid rgba(191,219,254,0.92)",
      background: "rgba(255,255,255,0.86)",
      color: "#3B82F6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 10px 24px rgba(59,130,246,0.08)",
    },
  };
}

function getTopBarTheme(isDark: boolean): TopBarTheme {
  if (isDark) {
    return getDarkTopBarTheme();
  }

  return getLightTopBarTheme();
}

function ToolbarIconButton({
  ariaLabel,
  onClick,
  children,
  style,
}: Readonly<{
  ariaLabel: string;
  onClick?: () => void;
  children: React.ReactNode;
  style: React.CSSProperties;
}>) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} style={style}>
      {children}
    </button>
  );
}

function TopBarUserChip({ isDark, theme }: Readonly<{ isDark: boolean; theme: TopBarTheme }>) {
  return (
    <div
      className="hidden md:flex items-center gap-3 rounded-full pl-3 pr-4 py-2.5"
      style={{
        background: theme.userBg,
        border: theme.userBorder,
        boxShadow: theme.userShadow,
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-blue-800 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(29,78,216,0.28)]">
        AD
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold" style={{ color: isDark ? "#F8FAFC" : "#16325C" }}>Admin User</p>
        <p className="text-[11px]" style={{ color: isDark ? "#8AA3B8" : "#6B85A6" }}>Coastal Management Dept.</p>
      </div>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: isDark ? "#94A3B8" : "#6B85A6" }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

function SidebarStatusBanner({
  loading,
  error,
  reload,
  theme,
}: Readonly<{
  loading: boolean;
  error: string | null;
  reload: () => void;
  theme: SidebarThemeTokens;
}>) {
  if (!loading && !error) {
    return null;
  }

  return (
    <div className="px-5 py-3" style={{ borderBottom: `1px solid ${theme.dividerClr}` }}>
      {loading ? (
        <span className="text-xs text-yellow-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span>Refreshing dashboard...</span>
        </span>
      ) : null}
      {error ? (
        <div className="text-xs text-red-400">
          Warning: {error}{" "}
          <button onClick={reload} className="underline hover:text-red-300">Retry</button>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNavLink({
  href,
  label,
  description,
  icon,
  accent,
  active,
  isDark,
  theme,
}: Readonly<NavItem & { active: boolean; isDark: boolean; theme: SidebarThemeTokens }>) {
  const item = { href, label, description, icon, accent };
  const itemTheme = active
    ? getActiveNavItemTokens(item, isDark, theme)
    : getInactiveNavItemTokens(item, isDark, theme);

  return (
    <Link
      href={href}
      className="group relative flex items-center gap-3 rounded-[22px] px-3.5 py-3.5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: itemTheme.cardBackground,
        border: itemTheme.cardBorder,
        boxShadow: itemTheme.cardShadow,
      }}
    >
      {active ? (
        <span className="absolute inset-y-3 left-0 w-1 rounded-full" style={{ background: accent }} />
      ) : null}
      <span
        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
        style={{
          background: itemTheme.iconBackground,
          color: itemTheme.iconColor,
          border: active ? undefined : `1px solid ${theme.iconTileBorder}`,
          boxShadow: itemTheme.iconBoxShadow,
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold leading-none" style={{ color: itemTheme.titleColor }}>
          {label}
        </span>
        <span className="mt-1.5 block text-[12px] leading-snug" style={{ color: itemTheme.descriptionColor }}>
          {description}
        </span>
      </span>
      {active ? (
        <span className="relative z-10 h-3 w-3 shrink-0 rounded-full" style={{ background: accent, boxShadow: itemTheme.indicatorGlow }} />
      ) : null}
    </Link>
  );
}

function SidebarFooter({ isDark, theme }: Readonly<{ isDark: boolean; theme: SidebarThemeTokens }>) {
  return (
    <div className="p-4 space-y-4" style={{ borderTop: `1px solid ${theme.dividerClr}` }}>
      <div
        className="rounded-[24px] p-5"
        style={{
          background: isDark
            ? "linear-gradient(145deg, rgba(8,145,178,0.26) 0%, rgba(15,118,110,0.16) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(230,242,255,0.88) 100%)",
          border: isDark ? "1px solid rgba(103,232,249,0.22)" : "1px solid rgba(147,197,253,0.62)",
          boxShadow: isDark ? "0 18px 40px rgba(8,145,178,0.1)" : "0 14px 34px rgba(37,99,235,0.12)",
          backgroundImage: isDark ? undefined : `linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(230,242,255,0.82) 100%), ${OCEAN_BG_IMAGE}`,
          backgroundSize: isDark ? undefined : "cover",
          backgroundPosition: isDark ? undefined : "center",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15c1.6 0 1.6-1 3.2-1s1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1M4 10c1.4-.8 2.8-1.2 4.2-1.2 2.2 0 4.4 1.2 6.6 1.2 1.7 0 3.4-.4 5.2-1.4" />
            </svg>
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: isDark ? "#67E8F9" : "#0369A1" }}>
              Coastal Guardian
            </span>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed font-medium" style={{ color: isDark ? "#F0FDFA" : "#35557B" }}>
          Restoring Sri Lanka’s coral reefs for a sustainable future.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-[22px] px-3.5 py-3" style={{ background: theme.baseCardBg, border: `1px solid ${theme.baseCardBorder}` }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-700 text-white shadow-[0_10px_24px_rgba(13,148,136,0.25)]">
          N
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-none" style={{ color: isDark ? "#F8FAFC" : "#14315B" }}>
            Admin User
          </p>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: isDark ? "#8AA3B8" : "#6983A4" }}>
            Coastal Management Dept.
          </p>
          <span className="mt-2 inline-flex rounded-full bg-gradient-to-r from-red-400 to-rose-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(248,113,113,0.24)]">
            11 Issues
          </span>
        </div>
      </div>
      <p className="px-1 text-[12px]" style={{ color: isDark ? "#8AA3B8" : "#6B85A6" }}>
        Coastal Management Dept.
      </p>
    </div>
  );
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard/global":     "Islandwide Reef Overview",
  "/dashboard/simulation": "Action Planning Dashboard",
  "/dashboard/temporal":   "Future Bleaching Outlook",
  "/dashboard/spatial":    "Reef Location Risk Map",
  "/dashboard/drivers":    "What Is Driving Bleaching",
};

// ── Top Nav Bar ───────────────────────────────────────────────────────────────
function TopNavBar() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useDashboardData();
  const pageLabel = PAGE_LABELS[pathname] ?? "Dashboard";
  const theme = getTopBarTheme(isDark);

  return (
    <header
      aria-label={`Toolbar for ${pageLabel}`}
      className="relative z-20 h-[76px] shrink-0 overflow-hidden rounded-[30px] px-5 md:px-6"
      style={{
        background: theme.shellBg,
        border: theme.shellBorder,
        boxShadow: isDark ? "none" : "0 24px 44px rgba(37,99,235,0.1)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: theme.overlay,
          backgroundPosition: "center right",
          backgroundSize: "cover",
        }}
      />
      <div className="relative flex h-full items-center gap-4">
        <div
          className="hidden sm:flex items-center gap-3 rounded-full px-4 py-3"
          style={{
            background: theme.pillBg,
            border: theme.pillBorder,
            boxShadow: theme.pillShadow,
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-700 text-white shadow-[0_10px_24px_rgba(14,165,233,0.3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 15.5c3 .9 6-1.3 6-4.5 0-2.5-1.8-4.5-4.2-4.5A4.55 4.55 0 005.8 11c0 3.2 2.9 5.6 6 4.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.3 9.4c1.5 2.2 4.5 4.5 8.1 5" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: theme.pillText }}>
            CORAL Revive
          </span>
        </div>

        <div className="flex min-w-0 flex-1 max-w-[420px] items-center gap-3 rounded-full px-4 py-3"
          style={{
            background: theme.inputBg,
            border: theme.inputBorder,
            boxShadow: isDark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.84)",
          }}>
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.iconColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
          </svg>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: theme.inputText }}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #34D5FF 0%, #1D9BFF 100%)",
              color: "#FFFFFF",
              boxShadow: "0 14px 26px rgba(56,189,248,0.28)",
            }}
          >
            <span className="h-2 w-2 rounded-full bg-white/90 animate-pulse" />
            <span>LIVE</span>
          </span>

          <ToolbarIconButton ariaLabel="Notifications" style={theme.buttonStyle}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.857 17H19l-1.2-1.2a2 2 0 01-.586-1.414V11a5.214 5.214 0 00-3.429-4.905V5.75a1.786 1.786 0 10-3.572 0v.345A5.214 5.214 0 006.786 11v3.386A2 2 0 016.2 14.8L5 17h4.143m5.714 0a2.857 2.857 0 11-5.714 0m5.714 0H9.143" />
            </svg>
          </ToolbarIconButton>

          <ToolbarIconButton ariaLabel="Toggle theme" onClick={toggleTheme} style={theme.buttonStyle}>
            {isDark ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zm0 15a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0112 17.25zm9-5.25a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0121 12zM5.25 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM18.364 5.636a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zM7.757 16.243a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zM18.364 18.364a.75.75 0 01-1.06 0l-1.061-1.06a.75.75 0 111.06-1.061l1.061 1.06a.75.75 0 010 1.061zM7.757 7.757a.75.75 0 01-1.06 0L5.636 6.697a.75.75 0 011.06-1.061l1.061 1.06a.75.75 0 010 1.061zM12 7.5A4.5 4.5 0 1112 16.5 4.5 4.5 0 0112 7.5z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.598 2.223a.75.75 0 01.14.814 8.25 8.25 0 0010.225 10.225.75.75 0 01.814.14.75.75 0 01.176.786A10.5 10.5 0 1110.384 3.617a.75.75 0 01.786.176.75.75 0 01.14.814 8.25 8.25 0 00-1.712-1.384z" clipRule="evenodd" />
              </svg>
            )}
          </ToolbarIconButton>

          <TopBarUserChip isDark={isDark} theme={theme} />
        </div>
      </div>
    </header>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function DashboardSidebar() {
  const pathname = usePathname();
  const { loading, error, reload, isDark } = useDashboardData();
  const theme = getSidebarThemeTokens(isDark);

  return (
    <aside
      className="w-[228px] flex flex-col shrink-0 overflow-hidden rounded-[30px]"
      style={{
        minHeight: "calc(100vh - 2rem)",
        background: theme.sidebarBg,
        border: `1px solid ${theme.sidebarBdr}`,
        boxShadow: isDark ? "none" : "0 24px 46px rgba(37,99,235,0.1)",
      }}
    >
      {/* Logo */}
      <div className="relative overflow-hidden px-5 pt-7 pb-6" style={{ borderBottom: `1px solid ${theme.dividerClr}` }}>
        <div
          className="absolute -top-20 -left-14 w-44 h-44 rounded-full blur-3xl"
          style={{ background: isDark ? "rgba(8,145,178,0.16)" : "rgba(14,165,233,0.12)" }}
        />
        <div
          className="absolute top-10 right-0 w-32 h-32 rounded-full blur-3xl"
          style={{ background: isDark ? "rgba(45,212,191,0.12)" : "rgba(37,99,235,0.1)" }}
        />

        <div className="relative flex items-center gap-3">
          <img src="/blue-logo.png" alt="CORAL Revive"
            className="shrink-0"
            style={{ height:"auto", width:"100%", maxWidth:210, objectFit:"contain",
              filter: isDark ? "brightness(0) invert(1)" : "none" }}
          />
        </div>

        <div
          className="relative mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold"
          style={{
            background: theme.statusBg,
            border: `1px solid ${theme.statusBorder}`,
            color: isDark ? "#5EEAD4" : "#0F766E",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE · 2,000 records</span>
        </div>
      </div>

      <SidebarStatusBanner loading={loading} error={error} reload={reload} theme={theme} />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">
        <div className="px-2 pb-3">
          <p className="text-[12px] font-bold uppercase tracking-[0.28em]" style={{ color: theme.navCaption }}>
            Navigation
          </p>
        </div>
        <div className="space-y-3">
          {NAV.map((item) => (
            <SidebarNavLink
              key={item.label}
              {...item}
              active={pathname === item.href}
              isDark={isDark}
              theme={theme}
            />
          ))}
        </div>
      </nav>

      <SidebarFooter isDark={isDark} theme={theme} />
    </aside>
  );
}

// ── Layout root ───────────────────────────────────────────────────────────────
function DashboardShell({ children }: LayoutProps) {
  const { isDark } = useDashboardData();
  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: isDark ? "linear-gradient(180deg, #010510 0%, #020814 100%)" : "transparent",
        color: isDark ? "#f1f5f9" : "#1e293b",
      }}
    >
      <div className="flex min-h-[calc(100vh-2rem)] gap-4">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TopNavBar />
          <div
            className="relative min-h-0 flex-1 overflow-hidden rounded-[32px]"
            style={{
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "none",
              background: isDark
                ? "linear-gradient(180deg, rgba(3,10,20,0.96) 0%, rgba(2,8,16,0.96) 100%)"
                : "transparent",
            }}
          >

            <main className="relative z-10 h-full overflow-auto">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
