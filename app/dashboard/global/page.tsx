"use client";
import { useState, useMemo } from "react";
import { useDashboardData } from "../useDashboardData";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Rectangle,
} from "recharts";

const OCEAN_BG_IMAGE = 'url("/Beautiful%20Coral%20Reef%20Ocean%20Background.png")';

function getDashboardCardStyle(isDark: boolean): React.CSSProperties {
  if (isDark) {
    return {
      background: "linear-gradient(180deg, #09101b 0%, #050b14 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "none",
    };
  }

  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(246,250,255,0.88) 100%)",
    border: "1px solid rgba(203,225,246,0.96)",
    boxShadow: "0 20px 40px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
  };
}

/* ── KPI Card ─────────────────────────────────────── */
const KPI_ACCENT: Record<string, { from: string; to: string; glow: string; iconColor: string; icon: React.ReactNode }> = {
  risk: {
    from: "#ff8a5b",
    to: "#ff5b6a",
    glow: "rgba(255,138,91,0.16)",
    iconColor: "#ff8558",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 4.5l8 14H4l8-14z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 9v4m0 3h.01" />
      </svg>
    ),
  },
  heat: {
    from: "#24c4ff",
    to: "#1a84ff",
    glow: "rgba(36,196,255,0.16)",
    iconColor: "#1d9cff",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M14 14.76V5a2 2 0 10-4 0v9.76a4 4 0 104 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 11v5" />
      </svg>
    ),
  },
  bleach: {
    from: "#21c8ff",
    to: "#1789ff",
    glow: "rgba(33,200,255,0.16)",
    iconColor: "#12a7ff",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 3v18M8 7l4 4m4-4l-4 4M6 13l6 6m0-6l6 6M6 9l2 2m8-2l2 2" />
      </svg>
    ),
  },
  sites: {
    from: "#27c9ff",
    to: "#1b82ff",
    glow: "rgba(39,201,255,0.16)",
    iconColor: "#2192ff",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 21s6-5.2 6-10.5a6 6 0 10-12 0C6 15.8 12 21 12 21z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 12.5a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
};

function KPICard({ title, value, sub, gauge, isDark, accentKey }: Readonly<{
  title: string;
  value: string | number;
  sub: string;
  gauge?: number;
  isDark?: boolean;
  accentKey?: string;
}>) {
  const acc = KPI_ACCENT[accentKey ?? "sites"];
  const cardStyle = getDashboardCardStyle(Boolean(isDark));
  let barColor = acc.from;

  if (typeof gauge === "number") {
    if (gauge > 60) {
      barColor = "#ef4444";
    } else if (gauge > 35) {
      barColor = "#f97316";
    } else {
      barColor = "#22c55e";
    }
  }

  return (
    <div
      style={{
        ...cardStyle,
        borderRadius: 20,
        padding: "15px 15px 13px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        overflow: "hidden",
        boxShadow: isDark
          ? "0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)"
          : `${cardStyle.boxShadow}, 0 10px 26px ${acc.glow}`,
      }}
    >
      {/* Accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 15, right: 15, height: 4,
        background: `linear-gradient(90deg, ${acc.from}, ${acc.to})`,
        borderRadius: "0 0 999px 999px",
      }} />

      {/* Icon + title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            color: acc.iconColor,
            background: isDark ? `${acc.iconColor}18` : `${acc.iconColor}14`,
            border: isDark ? `1px solid ${acc.iconColor}30` : `1px solid ${acc.iconColor}22`,
          }}
        >
          {acc.icon}
        </span>
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.14em", color: isDark ? "#8AA3B8" : "#7A95B6",
        }}>{title}</div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 22, fontWeight: 800, lineHeight: 1,
        background: "linear-gradient(90deg, #21C8FF, #187EFF)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>{value}</div>

      {/* Gauge bar */}
      {gauge !== undefined && (
        <div style={{ height: 4, borderRadius: 999, background: isDark ? "rgba(30,41,59,0.82)" : "#E4EEF9", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 999,
            width: `${Math.min(100, gauge)}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            transition: "width 0.6s ease",
          }} />
        </div>
      )}

      {/* Sub label */}
      <div style={{ fontSize: 11, color: isDark ? "#64748b" : "#6C87A8", lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

/* ── Risk Gauge (semi-circle SVG) ─────────────────── */
function RiskGauge({ value }: Readonly<{ value: number }>) {
  const pct = Math.min(100, Math.max(0, value));

  // Correct mapping: 0% = left (Low), 50% = top (Med), 100% = right (High)
  const rad = Math.PI * (1 - pct / 100);
  const cx = 76, cy = 72, r = 54;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  // Dynamic colour based on risk level
  const needleColor = pct < 33 ? "#22c55e" : pct < 66 ? "#f59e0b" : "#ef4444";
  const glowColor   = pct < 33 ? "rgba(34,197,94,0.30)" : pct < 66 ? "rgba(245,158,11,0.30)" : "rgba(239,68,68,0.30)";

  // Boundary points between colour zones
  const p33x = cx + r * Math.cos(Math.PI * 0.67);
  const p33y = cy - r * Math.sin(Math.PI * 0.67);
  const p66x = cx + r * Math.cos(Math.PI * 0.34);
  const p66y = cy - r * Math.sin(Math.PI * 0.34);
  const f = (n: number) => n.toFixed(1);

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="90" viewBox="0 0 152 104">
        <defs>
          <filter id="nGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="pivotGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Outer glow ring */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={glowColor} strokeWidth="15" strokeLinecap="round" />
        {/* Track background */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#DDE8F8" strokeWidth="12" strokeLinecap="round" />
        {/* Green zone */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${f(p33x)} ${f(p33y)}`}
          fill="none" stroke="#22c55e" strokeWidth="9" strokeLinecap="round" />
        {/* Yellow zone */}
        <path d={`M ${f(p33x)} ${f(p33y)} A ${r} ${r} 0 0 1 ${f(p66x)} ${f(p66y)}`}
          fill="none" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" />
        {/* Red zone */}
        <path d={`M ${f(p66x)} ${f(p66y)} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#ef4444" strokeWidth="9" strokeLinecap="round" />

        {/* Tick marks */}
        {[0, 33, 66, 100].map((t) => {
          const tr = Math.PI * (1 - t / 100);
          return (
            <line key={t}
              x1={f(cx + (r - 5) * Math.cos(tr))} y1={f(cy - (r - 5) * Math.sin(tr))}
              x2={f(cx + (r + 4) * Math.cos(tr))} y2={f(cy - (r + 4) * Math.sin(tr))}
              stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          );
        })}

        {/* Needle shadow */}
        <line x1={cx} y1={cy} x2={f(nx + 0.6)} y2={f(ny + 1.2)}
          stroke="rgba(0,0,0,0.12)" strokeWidth="4" strokeLinecap="round" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={f(nx)} y2={f(ny)}
          stroke={needleColor} strokeWidth="2.8" strokeLinecap="round" filter="url(#nGlow)" />

        {/* Pivot */}
        <circle cx={cx} cy={cy} r="9" fill={glowColor} filter="url(#pivotGlow)" />
        <circle cx={cx} cy={cy} r="7.5" fill="#EAF1FB" />
        <circle cx={cx} cy={cy} r="5" fill={needleColor} />
        <circle cx={cx} cy={cy} r="2" fill="#ffffff" />

        {/* Labels */}
        <text x="2"      y={cy + 16} fill="#94a3b8" fontSize="9" fontWeight="700">Low</text>
        <text x={cx - 9} y="11"      fill="#94a3b8" fontSize="9" fontWeight="700">Med</text>
        <text x="115"   y={cy + 16} fill="#94a3b8" fontSize="9" fontWeight="700">High</text>
      </svg>

      <div style={{ fontSize: 28, fontWeight: 800, color: needleColor, lineHeight: 1, marginTop: -4,
        textShadow: `0 0 14px ${glowColor}` }}>
        {pct.toFixed(1)}
      </div>
      <div style={{ fontSize: 11, color: "#6C87A8", marginTop: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
        Islandwide Reef Risk
      </div>
    </div>
  );
}

const CLUSTER_COLORS: Record<string, string> = {
  "High Risk": "#ef4444",
  "Medium Risk": "#eab308",
  "Low Risk": "#22c55e",
};

const SRI_LANKA_OUTLINE: [number, number][] = [
  [9.85, 80.02], [9.78, 80.25], [9.6, 80.55], [9.2, 81.38],
  [8.57, 81.22], [8.33, 81.35], [7.72, 81.7], [7.29, 81.84],
  [6.9, 81.78], [6.6, 81.56], [6.22, 81.18], [5.92, 80.5],
  [6.03, 80.15], [6.3, 79.96], [6.83, 79.87], [7.25, 79.82],
  [7.85, 79.78], [8.3, 79.88], [8.56, 79.91], [9.19, 79.88],
  [9.5, 79.85], [9.8, 79.82],
];

type MapTooltipState = {
  site: string;
  cluster: string;
  bleaching: number;
  dhw: number;
  x: number;
  y: number;
};

function getUniqueGeoSites(geoData: GeoSite[]): GeoSite[] {
  const siteMap = new Map<string, GeoSite>();

  for (const site of geoData) {
    if (!siteMap.has(site.site)) {
      siteMap.set(site.site, site);
    }
  }

  return Array.from(siteMap.values());
}

function getGeoRiskCounts(sites: GeoSite[]) {
  return ["High Risk", "Medium Risk", "Low Risk"].map((label) => ({
    label,
    count: sites.filter((site) => site.cluster === label).length,
  }));
}

function MapSiteTooltip({ tooltip, isDark }: Readonly<{ tooltip: MapTooltipState | null; isDark: boolean }>) {
  if (!tooltip) {
    return null;
  }

  return (
    <div style={{
      position: "absolute",
      left: Math.min(tooltip.x + 16, 160),
      top: Math.max(tooltip.y - 64, 10),
      background: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
      border: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(203,225,246,0.96)",
      borderRadius: 16,
      padding: "10px 14px",
      boxShadow: "0 18px 34px rgba(15,23,42,0.18)",
      minWidth: 158,
      zIndex: 10,
      pointerEvents: "none",
      backdropFilter: "blur(14px)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: isDark ? "#f1f5f9" : "#16325C" }}>{tooltip.site}</div>
      <div style={{ fontSize: 11, color: CLUSTER_COLORS[tooltip.cluster], fontWeight: 700, margin: "4px 0" }}>{tooltip.cluster}</div>
      <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#5F7B9E" }}>Bleaching: <strong>{tooltip.bleaching}%</strong></div>
      <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#5F7B9E" }}>Heat Stress: <strong>{typeof tooltip.dhw === "number" ? tooltip.dhw.toFixed(1) : tooltip.dhw}</strong></div>
    </div>
  );
}

/* ── Sri Lanka Reef Map ───────────────────────────────── */
type GeoSite = { site: string; cluster: string; bleaching: number; dhw: number; lat: number; lon: number };

function SriLankaMap({ geoData, isDark, card }: Readonly<{ geoData: GeoSite[]; isDark: boolean; card: React.CSSProperties }>) {
  const sites = getUniqueGeoSites(geoData);
  const riskCount = getGeoRiskCounts(sites);

  return (
    <div className="relative overflow-hidden rounded-[30px] p-6" style={card}>
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.42)), ${OCEAN_BG_IMAGE}`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V6.618a1 1 0 01.553-.894L9 3m0 17l6-3m-6 3V3m6 14l6 3m-6-3V6m6 14V6m0 0l-6-3m6 3l-6 3m-6-3l6 3" />
              </svg>
            </div>
            <div>
              <h2 style={{ color: isDark ? "#f1f5f9" : "#16325C", fontWeight: 700, fontSize: 16, margin: 0 }}>Sri Lanka Reef Site Risk Map</h2>
              <p style={{ color: isDark ? "#64748b" : "#5F7B9E", fontSize: 12, marginTop: 4 }}>
                {sites.length} monitored reef sites around Sri Lanka — colored by risk cluster. Hover to inspect each site.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {riskCount.map(({ label, count }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: CLUSTER_COLORS[label] }}>{count}</div>
                <div style={{ fontSize: 10, color: isDark ? "#64748b" : "#5F7B9E" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          <div className="relative flex-shrink-0 overflow-hidden rounded-[24px]" style={{ width: 300, height: 460, boxShadow: isDark ? "none" : "0 18px 36px rgba(37,99,235,0.16)" }}>
            {/* Actual Sri Lanka reef map image */}
            <img
              src="/Sri Lanka Reef Sites Map.png"
              alt="Sri Lanka Reef Sites Map"
              style={{ width: 300, height: 460, objectFit: "cover", display: "block", borderRadius: 24 }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: isDark ? "#475569" : "#4A6080", marginBottom: 12 }}>
              All Monitored Sites
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 412, overflowY: "auto", paddingRight: 4 }}>
              {sites.map((site) => {
                const color = CLUSTER_COLORS[site.cluster] ?? "#94a3b8";

                return (
                  <div key={site.site} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 18, background: isDark ? "rgba(10,15,24,0.88)" : "rgba(255,255,255,0.84)",
                    border: isDark ? "1px solid rgba(148,163,184,0.12)" : "1px solid rgba(221,232,248,0.92)",
                    boxShadow: isDark ? "none" : "0 12px 24px rgba(59,130,246,0.08)",
                    transition: "all 0.15s", cursor: "default",
                  }}>
                    <div style={{ width: 11, height: 11, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}66` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#e2e8f0" : "#17365D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.site}</div>
                      <div style={{ fontSize: 11, color: isDark ? "#64748b" : "#5F7B9E" }}>{site.cluster} · {site.bleaching}% bleaching · DHW {typeof site.dhw === "number" ? site.dhw.toFixed(1) : site.dhw}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999, flexShrink: 0,
                      background: `${color}18`, color,
                      border: `1px solid ${color}3A`,
                    }}>{site.cluster.split(" ")[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Site Time Series Charts ───────────────────────── */
type SiteTS = {
  site: string;
  points: { year: number; bleaching: number; damageState: string; damageNum: number }[];
};

type WaterQualityTS = {
  site: string;
  points: { year: number; ph: number | null; salinity: number | null; nitrate: number | null; dissolved_o2: number | null }[];
};

const DAMAGE_COLORS: Record<string, string> = { healthy: "#22c55e", watch: "#eab308", bleached: "#ef4444", severe_bleach: "#7c3aed" };
const DAMAGE_LABELS: Record<string, string> = { healthy: "Healthy", watch: "Watch", bleached: "Bleached", severe_bleach: "Severe Bleach" };

const WQ_VARS = [
  { key: "ph",          label: "pH",            unit: "",     color: "#06b6d4", gradient: ["#06b6d4","#0891b2"] },
  { key: "salinity",    label: "Salinity",      unit: " ppt", color: "#8b5cf6", gradient: ["#8b5cf6","#7c3aed"] },
  { key: "nitrate",     label: "Nitrate",       unit: " μM",  color: "#f59e0b", gradient: ["#f59e0b","#d97706"] },
  { key: "dissolved_o2",label: "Dissolved O₂",  unit: " mg/L",color: "#10b981", gradient: ["#10b981","#059669"] },
];

type ChartTick = { fill: string; fontSize: number };

type SiteTimeSeriesChartProps = Readonly<{
  siteTimeSeries: SiteTS[];
  isDark: boolean;
  card: React.CSSProperties;
  GRID: string;
  TICK: ChartTick;
  TT: React.CSSProperties;
  selectedSite: string;
  setSelectedSite: (site: string) => void;
}>;

type WaterQualityChartProps = Readonly<{
  waterQualityTimeSeries: WaterQualityTS[];
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>;

type DamagePoint = { year: number; damageState: string; damageNum: number };

type DamageTooltipContentProps = Readonly<{
  active?: boolean;
  payload?: Array<{ payload: DamagePoint }>;
  label?: string | number;
  contentStyle: React.CSSProperties;
}>;

function DamageTooltipContent({ active, payload, label, contentStyle }: DamageTooltipContentProps) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div style={{ ...contentStyle, padding: "8px 12px" }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>Year: {label}</div>
      <div style={{ color: DAMAGE_COLORS[point.damageState] ?? "#94a3b8", fontWeight: 600 }}>
        {DAMAGE_LABELS[point.damageState] ?? point.damageState}
      </div>
    </div>
  );
}

type DamageStateDotProps = Readonly<{
  cx?: number;
  cy?: number;
  payload?: DamagePoint;
  isDark: boolean;
}>;

function DamageStateDot({ cx, cy, payload, isDark }: DamageStateDotProps) {
  if (cx == null || cy == null || !payload) {
    return null;
  }

  return (
    <circle
      key={`dot-${payload.year}`}
      cx={cx}
      cy={cy}
      r={5}
      fill={DAMAGE_COLORS[payload.damageState] ?? "#94a3b8"}
      stroke={isDark ? "#070707" : "#fff"}
      strokeWidth={2}
    />
  );
}

function getWaterQualityVariableButtonStyle(
  variable: (typeof WQ_VARS)[number],
  active: boolean,
  isDark: boolean,
): React.CSSProperties {
  let border = isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8";
  let background = isDark ? "#0a0a0a" : "#F8FAFF";
  let color = isDark ? "#64748b" : "#94a3b8";

  if (active) {
    border = `1.5px solid ${variable.color}`;
    background = `linear-gradient(135deg, ${variable.gradient[0]}22, ${variable.gradient[1]}44)`;
    color = variable.color;
  }

  return {
    padding: "7px 16px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border,
    background,
    color,
    transition: "all 0.2s",
    boxShadow: active ? `0 0 12px ${variable.color}33` : "none",
  };
}

function getWaterQualitySiteButtonStyle(siteColor: string, active: boolean, isDark: boolean): React.CSSProperties {
  let border = isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8";
  let background = isDark ? "#0a0a0a" : "#F8FAFF";
  let color = isDark ? "#475569" : "#94a3b8";

  if (active) {
    border = `1.5px solid ${siteColor}`;
    background = `${siteColor}18`;
    color = siteColor;
  }

  return {
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border,
    background,
    color,
    transition: "all 0.2s",
    boxShadow: active ? `0 0 8px ${siteColor}33` : "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };
}

function getWaterQualitySiteDotColor(siteColor: string, active: boolean, isDark: boolean): string {
  if (active) {
    return siteColor;
  }

  return isDark ? "#334155" : "#cbd5e1";
}

function SiteTimeSeriesCharts({
  siteTimeSeries, isDark, card, GRID, TICK, TT, selectedSite, setSelectedSite,
}: SiteTimeSeriesChartProps) {
  const allSites = siteTimeSeries.map((s) => s.site);
  const selected = siteTimeSeries.find((s) => s.site === selectedSite);
  const points = selected?.points ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Shared site filter header spanning both */}
      <div className="lg:col-span-2 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? "#475569" : "#4A6080" }}>Filter by Site</div>
          <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{
            background: isDark ? "#0a0a0a" : "#F8FAFF",
            border: isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
            color: isDark ? "#e2e8f0" : "#0D1F3C",
            borderRadius: 8, padding: "6px 12px", fontSize: 13,
            outline: "none", cursor: "pointer", width: "100%", maxWidth: 320,
          }}>
            {allSites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-3 mt-4">
          {Object.entries(DAMAGE_LABELS).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: DAMAGE_COLORS[k], display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart 1: Time vs Bleaching % */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📈 Bleaching % Over Time</h2>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>Annual average bleaching percentage for <strong style={{ color: isDark ? "#e2e8f0" : "#0D1F3C" }}>{selectedSite}</strong>.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} label={{ value: "Year", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
            <YAxis tick={TICK} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }} />
            <Tooltip contentStyle={TT} formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Bleaching"]} />
            <Line type="monotone" dataKey="bleaching" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: "#f97316" }} name="Bleaching %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Time vs Damage State */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🩺 Damage State Over Time</h2>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>Annual reef condition for <strong style={{ color: isDark ? "#e2e8f0" : "#0D1F3C" }}>{selectedSite}</strong> — 0 Healthy · 1 Watch · 2 Bleached · 3 Severe.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} label={{ value: "Year", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
            <YAxis domain={[-0.2, 3.2]} ticks={[0, 1, 2, 3]} tick={{ ...TICK, fontSize: 11 }}
              tickFormatter={(v) => ["Healthy", "Watch", "Bleached", "Severe"][v] ?? ""} width={60} />
            <Tooltip contentStyle={TT} content={<DamageTooltipContent contentStyle={TT} />} />
            <Line type="stepAfter" dataKey="damageNum" strokeWidth={2.5}
              dot={<DamageStateDot isDark={isDark} />}
              stroke="#0d9488" name="Damage State" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Water Quality Chart ───────────────────────────── */
const SITE_PALETTE = [
  "#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#ec4899","#84cc16","#6366f1",
];

function WaterQualityChart({
  waterQualityTimeSeries, isDark, GRID, TICK,
}: WaterQualityChartProps) {
  const allSites = waterQualityTimeSeries.map((s) => s.site);
  const [activeVar, setActiveVar] = useState<string>("dissolved_o2");
  const [selectedSites, setSelectedSites] = useState<string[]>(allSites.slice(0, 1));

  const varMeta = WQ_VARS.find((v) => v.key === activeVar) ?? WQ_VARS[0];

  // Toggle a site on/off; always keep at least one selected
  function toggleSite(site: string) {
    setSelectedSites((prev) => {
      if (prev.includes(site)) {
        return prev.length > 1 ? prev.filter((s) => s !== site) : prev;
      }
      return [...prev, site];
    });
  }

  // Build merged dataset keyed by year with one column per selected site
  const mergedMap = new Map<number, Record<string, number | null>>();
  selectedSites.forEach((site) => {
    const pts = waterQualityTimeSeries.find((s) => s.site === site)?.points ?? [];
    pts.forEach((p) => {
      const val = (p as Record<string, unknown>)[activeVar] as number | null;
      if (!mergedMap.has(p.year)) mergedMap.set(p.year, {});
      mergedMap.get(p.year)![site] = val;
    });
  });
  const chartData = Array.from(mergedMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, vals]) => ({ year, ...vals }));

  // Domain across all selected sites
  const allValues = selectedSites.flatMap((site) =>
    (waterQualityTimeSeries.find((s) => s.site === site)?.points ?? [])
      .map((p) => (p as Record<string, unknown>)[activeVar] as number | null)
      .filter((v): v is number => v !== null)
  );
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const padding = (maxVal - minVal) * 0.15 || 0.5;

  const cardStyle = getDashboardCardStyle(isDark);

  const TT: React.CSSProperties = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#334155", fontSize: 12 };

  // Stats for single-site view only
  const singleSitePts = selectedSites.length === 1
    ? (waterQualityTimeSeries.find((s) => s.site === selectedSites[0])?.points ?? [])
        .map((p) => (p as Record<string, unknown>)[activeVar] as number | null)
        .filter((v): v is number => v !== null)
    : [];

  return (
    <div className="rounded-2xl p-6" style={{ ...cardStyle }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${varMeta.gradient[0]}22, ${varMeta.gradient[1]}44)`,
            border: `1px solid ${varMeta.color}33`,
          }}>
            <span style={{ fontSize: 18 }}>💧</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: isDark ? "#f1f5f9" : "#0D1F3C" }}>Water Quality Trends</h2>
            <p style={{ margin: 0, fontSize: 12, color: isDark ? "#64748b" : "#4A6080" }}>
              {varMeta.label} over time · compare reef sites
            </p>
          </div>
        </div>

        {/* Variable selector tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WQ_VARS.map((v) => {
            const active = v.key === activeVar;
            return (
              <button key={v.key} onClick={() => setActiveVar(v.key)} style={getWaterQualityVariableButtonStyle(v, active, isDark)}>
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Site selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: isDark ? "#475569" : "#4A6080", marginBottom: 8 }}>
          Select Sites to Compare
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allSites.map((site, i) => {
            const siteColor = SITE_PALETTE[i % SITE_PALETTE.length];
            const active = selectedSites.includes(site);
            return (
              <button key={site} onClick={() => toggleSite(site)} style={getWaterQualitySiteButtonStyle(siteColor, active, isDark)}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: getWaterQualitySiteDotColor(siteColor, active, isDark), display: "inline-block", flexShrink: 0 }} />
                {site}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row — only shown for single-site view */}
      {selectedSites.length === 1 && singleSitePts.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Current", val: singleSitePts.at(-1)?.toFixed(2) ?? "—" },
            { label: "Min", val: Math.min(...singleSitePts).toFixed(2) },
            { label: "Max", val: Math.max(...singleSitePts).toFixed(2) },
            { label: "Avg", val: (singleSitePts.reduce((a, b) => a + b, 0) / singleSitePts.length).toFixed(2) },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, minWidth: 80, padding: "10px 14px", borderRadius: 12,
              background: isDark ? "#0a0a0a" : "#F8FAFF",
              border: isDark ? `1px solid ${varMeta.color}22` : `1px solid ${varMeta.color}33`,
            }}>
              <div style={{ fontSize: 11, color: isDark ? "#475569" : "#94a3b8", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: varMeta.color }}>{s.val}{varMeta.unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false}
            label={{ value: "Year", position: "insideBottom", offset: -4, fill: TICK.fill, fontSize: 11 }} />
          <YAxis
            domain={[Math.floor(minVal - padding), Math.ceil(maxVal + padding)]}
            tick={TICK} axisLine={false} tickLine={false} width={65}
            tickFormatter={(v: number) => Number(v).toFixed(1)}
            label={{ value: `${varMeta.label}${varMeta.unit}`, angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }} />
          <Tooltip contentStyle={TT}
            formatter={(v: unknown, name: unknown) => [`${Number(v).toFixed(3)}${varMeta.unit}`, String(name)]}
            labelFormatter={(l) => `Year: ${l}`} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {selectedSites.map((site, i) => {
            const siteColor = SITE_PALETTE[i % SITE_PALETTE.length];
            return (
              <Line key={site} type="monotone" dataKey={site} stroke={siteColor} strokeWidth={2.5}
                dot={{ r: 4, fill: siteColor, stroke: isDark ? "#070707" : "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: siteColor, stroke: isDark ? "#070707" : "#fff", strokeWidth: 2 }}
                name={site} connectNulls />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Types for table + pies ───────────────────────── */
type RawRow = {
  year: number | null; month: number | null; day: number | null;
  site: string; lat: number | null; lon: number | null;
  temp: number | null; ssta: number | null; dhw: number | null;
  enso: string; chl: number | null; bleaching: number | null;
  damage: string; salinity: number | null; do2: number | null;
  ph: number | null; nitrate: number | null; depth: number | null;
  distShore: number | null; turbidity: number | null;
};

type PieStat = { name: string; value: number };
type ColoredPieStat = PieStat & {
  sliceKey: string;
  fill: string;
  opacity: number;
  stroke: string;
  strokeWidth: number;
};

type DatasetTableProps = Readonly<{ rows: RawRow[]; isDark: boolean }>;

function sortTextValues(a: string, b: string): number {
  return a.localeCompare(b);
}

function getRawRowKey(row: RawRow): string {
  return [
    row.site,
    row.year ?? "na",
    row.month ?? "na",
    row.day ?? "na",
    row.lat ?? "na",
    row.lon ?? "na",
    row.temp ?? "na",
    row.bleaching ?? "na",
  ].join(":");
}

function getBleachingColor(bleaching: number | null, fallbackColor: string): string {
  if (bleaching == null) {
    return fallbackColor;
  }

  if (bleaching > 50) {
    return "#ef4444";
  }

  if (bleaching > 25) {
    return "#eab308";
  }

  return "#22c55e";
}

type PieCardProps = Readonly<{
  title: string;
  subtitle: string;
  data: PieStat[];
  isDark: boolean;
  donut?: boolean;
}>;

type MonthlyBarCardProps = Readonly<{
  data: { name: string; value: number }[];
  isDark: boolean;
}>;

type PieChartsSectionProps = Readonly<{ rows: RawRow[]; isDark: boolean }>;

function getColoredPieData(data: PieStat[], active: number | null, isDark: boolean): ColoredPieStat[] {
  return data.map((item, index) => {
    const fill = PIE_COLORS[index % PIE_COLORS.length];
    const isVisible = active === null || active === index;
    const isActive = active === index;
    const activeStroke = isDark ? "#fff" : "#0D1F3C";

    return {
      ...item,
      sliceKey: `${item.name}-${item.value}`,
      fill,
      opacity: isVisible ? 1 : 0.35,
      stroke: isActive ? activeStroke : "transparent",
      strokeWidth: isActive ? 2 : 0,
    };
  });
}

type ColoredBarShapeProps = Readonly<React.ComponentProps<typeof Rectangle> & { payload?: { fill?: string } }>;

function ColoredBarShape({ payload, fill, ...rest }: ColoredBarShapeProps) {
  return <Rectangle {...rest} fill={payload?.fill ?? fill ?? PIE_COLORS[0]} />;
}

/* ── Dataset Table with Filters ────────────────────── */
const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAMAGE_BADGE: Record<string, string> = {
  healthy: "#22c55e", watch: "#eab308", bleached: "#ef4444",
  "severe bleach": "#7c3aed", "severe_bleach": "#7c3aed",
};

function DatasetTable({ rows, isDark }: DatasetTableProps) {
  const [filterSite, setFilterSite] = useState<string>("All");
  const [filterYear, setFilterYear] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");
  const [filterDamage, setFilterDamage] = useState<string>("All");

  const sites   = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.site))).sort(sortTextValues)], [rows]);
  const years   = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => String(r.year)).filter(Boolean))).sort(sortTextValues)], [rows]);
  const months  = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.month).filter(Boolean))).sort((a, b) => Number(a) - Number(b)).map(String)], [rows]);
  const damages = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => (r.damage || "").toLowerCase()))).sort(sortTextValues)], [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (filterSite  !== "All" && r.site !== filterSite)                             return false;
    if (filterYear  !== "All" && String(r.year) !== filterYear)                     return false;
    if (filterMonth !== "All" && String(r.month) !== filterMonth)                   return false;
    if (filterDamage !== "All" && (r.damage||"").toLowerCase() !== filterDamage)    return false;
    return true;
  }), [rows, filterSite, filterYear, filterMonth, filterDamage]);

  const cardStyle  = getDashboardCardStyle(isDark);
  const headerBg   = isDark ? "#0a0a0a" : "rgba(240,245,255,0.84)";
  const rowEven    = isDark ? "#050505" : "rgba(250,252,255,0.82)";
  const rowOdd     = isDark ? "#070707" : "rgba(255,255,255,0.9)";
  const textPri    = isDark ? "#e2e8f0" : "#0D1F3C";
  const textSec    = "#64748b";
  const borderCol  = isDark ? "#1C1C1C" : "#E4EDF7";
  const selStyle: React.CSSProperties = {
    background: isDark ? "#0a0a0a" : "#F8FAFF",
    border: isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
    color: textPri, borderRadius: 8, padding: "6px 12px",
    fontSize: 13, outline: "none", cursor: "pointer", minWidth: 130,
  };

  return (
    <div style={{ ...cardStyle, borderRadius: 16, padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPri }}>📋 Full Dataset View</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: textSec }}>
          All {rows.length} observation records — use filters to narrow down. Showing <strong style={{ color: textPri }}>{filtered.length}</strong> rows.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Reef Site</div>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} style={selStyle}>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Year</div>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selStyle}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Month</div>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selStyle}>
            {months.map(m => <option key={m} value={m}>{m === "All" ? "All" : MONTH_NAMES[Number(m)]}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Reef Condition</div>
          <select value={filterDamage} onChange={e => setFilterDamage(e.target.value)} style={selStyle}>
            {damages.map(d => <option key={d} value={d}>{d === "All" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        {(filterSite !== "All" || filterYear !== "All" || filterMonth !== "All" || filterDamage !== "All") && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={() => { setFilterSite("All"); setFilterYear("All"); setFilterMonth("All"); setFilterDamage("All"); }}
              style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: isDark ? "#1a1a1a" : "#eff6ff", color: "#3b82f6", border: "1px solid #3b82f633" }}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 480, borderRadius: 10, border: `1px solid ${borderCol}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: headerBg, position: "sticky", top: 0, zIndex: 2 }}>
              {["Year","Month","Day","Site","Lat","Lon","Temp °C","SSTA","DHW","ENSO","Chl-a","Bleaching %","Condition","Salinity","DO₂","pH","Nitrate","Depth m","Shore km","Turbidity"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: isDark ? "#94a3b8" : "#4A6080", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${borderCol}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const dmgKey = (r.damage||"").toLowerCase();
              const dmgColor = DAMAGE_BADGE[dmgKey] ?? "#94a3b8";
              const bleachingColor = getBleachingColor(r.bleaching, textSec);
              const bleachingLabel = typeof r.bleaching === "number" ? `${r.bleaching}%` : "-";
              const dhwHighlight = typeof r.dhw === "number" && r.dhw > 4;
              return (
                <tr key={getRawRowKey(r)} style={{ background: i % 2 === 0 ? rowEven : rowOdd }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? "#0f1a24" : "#EEF4FF")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? rowEven : rowOdd)}>
                  <td style={{ padding: "7px 12px", color: textPri, whiteSpace: "nowrap" }}>{r.year}</td>
                  <td style={{ padding: "7px 12px", color: textSec, whiteSpace: "nowrap" }}>{r.month ? MONTH_NAMES[r.month] : "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.day ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textPri, fontWeight: 600, whiteSpace: "nowrap" }}>{r.site}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.lat ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.lon ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: "#f97316", fontWeight: 600 }}>{r.temp ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.ssta ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: dhwHighlight ? "#ef4444" : textSec, fontWeight: dhwHighlight ? 700 : 400 }}>{r.dhw ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec, whiteSpace: "nowrap" }}>{r.enso}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.chl ?? "-"}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <span style={{ fontWeight: 700, color: bleachingColor }}>
                      {bleachingLabel}
                    </span>
                  </td>
                  <td style={{ padding: "7px 12px", whiteSpace: "nowrap" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: dmgColor + "20", color: dmgColor, border: `1px solid ${dmgColor}44` }}>
                      {(r.damage || "—").replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.salinity ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.do2 ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.ph ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.nitrate ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.depth ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.distShore ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.turbidity ?? "-"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={20} style={{ textAlign: "center", padding: 32, color: textSec }}>No records match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Pie Charts Section with shared filters ────────── */
const PIE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BLEACH_BANDS = [
  { name: "None (0%)",        min: 0,     max: 0.001 },
  { name: "Low (0–25%)",      min: 0.001, max: 25 },
  { name: "Moderate (25–50%)",min: 25,    max: 50 },
  { name: "High (50–75%)",    min: 50,    max: 75 },
  { name: "Severe (75–100%)", min: 75,    max: 101 },
];

function computePieStats(rows: RawRow[]) {
  // Damage state
  const dmgMap: Record<string, number> = {};
  for (const r of rows) {
    const d = (r.damage || "unknown").toLowerCase();
    dmgMap[d] = (dmgMap[d] ?? 0) + 1;
  }
  const damageState = Object.entries(dmgMap)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "), value }))
    .sort((a, b) => b.value - a.value);

  // ENSO phase
  const ensoMap: Record<string, number> = {};
  for (const r of rows) {
    const p = r.enso || "Unknown";
    ensoMap[p] = (ensoMap[p] ?? 0) + 1;
  }
  const ensoPhase = Object.entries(ensoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Bleaching severity
  const bleachSeverity = BLEACH_BANDS.map(({ name, min, max }) => ({
    name,
    value: rows.filter(r => r.bleaching != null && r.bleaching >= min && r.bleaching < max).length,
  })).filter(b => b.value > 0);

  // Observations per site
  const siteMap: Record<string, number> = {};
  for (const r of rows) { siteMap[r.site] = (siteMap[r.site] ?? 0) + 1; }
  const siteObservations = Object.entries(siteMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly distribution
  const monthlyObservations = Array.from({ length: 12 }, (_, i) => ({
    name: MONTH_LABELS[i],
    value: rows.filter(r => r.month === i + 1).length,
  })).filter(m => m.value > 0);

  return { damageState, ensoPhase, bleachSeverity, siteObservations, monthlyObservations };
}

/* single pie card (pure display) */
function PieCard({ title, subtitle, data, isDark, donut = false }: PieCardProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const cardStyle = getDashboardCardStyle(isDark);
  const textPri = isDark ? "#e2e8f0" : "#0D1F3C";
  const pieData = getColoredPieData(data, active, isDark);

  return (
    <div style={{ ...cardStyle, borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: textPri }}>{title}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{subtitle}</p>
      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#64748b" }}>No data for selected filters.</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%"
                innerRadius={donut ? 45 : 0} outerRadius={70}
                paddingAngle={2} dataKey="value"
                onMouseEnter={(_, idx) => setActive(idx)}
                onMouseLeave={() => setActive(null)}
              />
              <Tooltip
                contentStyle={{ background: isDark ? "#020202" : "#fff", border: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: isDark ? "#e2e8f0" : "#334155" }}
                formatter={(v: unknown) => [`${Number(v)} (${((Number(v) / total) * 100).toFixed(1)}%)`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, minWidth: 120, display: "flex", flexDirection: "column", gap: 5 }}>
            {pieData.map((slice, index) => (
              <button
                key={slice.sliceKey}
                type="button"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: active === null || active === index ? 1 : 0.45, transition: "opacity 0.15s", background: "transparent", border: "none", padding: 0, textAlign: "left" }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: slice.fill, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: isDark ? "#94a3b8" : "#4A6080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slice.name}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: slice.fill }}>{((slice.value / total) * 100).toFixed(1)}%</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* monthly bar card */
function MonthlyBarCard({ data, isDark }: MonthlyBarCardProps) {
  const cardStyle = getDashboardCardStyle(isDark);
  const textPri = isDark ? "#e2e8f0" : "#0D1F3C";
  const GRID = isDark ? "#1A1A1A" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const TT: React.CSSProperties = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#334155", fontSize: 12 };
  const chartData = data.map((item, index) => ({ ...item, fill: PIE_COLORS[index % PIE_COLORS.length] }));

  return (
    <div style={{ ...cardStyle, borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: textPri }}>📅 Survey Records by Month</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>Which months have the most reef observations in the filtered selection.</p>
      {data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#64748b" }}>No data for selected filters.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ bottom: 16, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={{ ...TICK, fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="value" name="Records" radius={[4, 4, 0, 0]} shape={<ColoredBarShape />} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ── Shared filter panel + all 5 charts ─────────────── */
function PieChartsSection({ rows, isDark }: PieChartsSectionProps) {
  const allYears = useMemo(() =>
    Array.from(new Set(rows.map(r => r.year).filter((y): y is number => y !== null))).sort((a, b) => a - b),
  [rows]);
  const allSites  = useMemo(() => Array.from(new Set(rows.map(r => r.site))).sort((a, b) => a.localeCompare(b)), [rows]);
  const allEnsos  = useMemo(() => Array.from(new Set(rows.map(r => r.enso).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);
  const allDamage = useMemo(() => Array.from(new Set(rows.map(r => (r.damage||"").toLowerCase()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);

  const minYear = allYears[0] ?? 2000;
  const maxYear = allYears.at(-1) ?? 2025;

  // Derive actual min/max dates from the dataset
  const minDateStr = useMemo(() => {
    let min = `${minYear}-01-01`;
    for (const r of rows) {
      if (r.year == null || r.month == null || r.day == null) continue;
      const s = `${r.year}-${String(r.month).padStart(2,"0")}-${String(r.day).padStart(2,"0")}`;
      if (s < min) min = s;
    }
    return min;
  }, [rows, minYear]);
  const maxDateStr = useMemo(() => {
    let max = `${maxYear}-12-31`;
    for (const r of rows) {
      if (r.year == null || r.month == null || r.day == null) continue;
      const s = `${r.year}-${String(r.month).padStart(2,"0")}-${String(r.day).padStart(2,"0")}`;
      if (s > max) max = s;
    }
    return max;
  }, [rows, maxYear]);

  const [dateFrom, setDateFrom] = useState<string>(minDateStr);
  const [dateTo,   setDateTo]   = useState<string>(maxDateStr);
  const [site,     setSite]     = useState<string>("All");
  const [enso,     setEnso]     = useState<string>("All");
  const [damage,   setDamage]   = useState<string>("All");

  // Sync initial state when data loads
  const dateFromNum = useMemo(() => dateFrom ? Number(dateFrom.replaceAll("-", "")) : 0, [dateFrom]);
  const dateToNum   = useMemo(() => dateTo   ? Number(dateTo.replaceAll("-", ""))   : 99999999, [dateTo]);

  const filtered = useMemo(() => rows.filter(r => {
    if (r.year != null && r.month != null && r.day != null) {
      const rowNum = r.year * 10000 + r.month * 100 + (r.day ?? 1);
      if (rowNum < dateFromNum || rowNum > dateToNum) return false;
    }
    if (site   !== "All" && r.site !== site)                                 return false;
    if (enso   !== "All" && r.enso !== enso)                                 return false;
    if (damage !== "All" && (r.damage||"").toLowerCase() !== damage)         return false;
    return true;
  }), [rows, dateFromNum, dateToNum, site, enso, damage]);

  const stats = useMemo(() => computePieStats(filtered), [filtered]);

  const cardStyle = getDashboardCardStyle(isDark);
  const textPri = isDark ? "#e2e8f0" : "#0D1F3C";
  const textSec = "#64748b";
  const sel: React.CSSProperties = {
    background: isDark ? "#0a0a0a" : "#F8FAFF",
    border: isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
    color: textPri, borderRadius: 8, padding: "6px 10px",
    fontSize: 12, outline: "none", cursor: "pointer",
  };
  const dateInput: React.CSSProperties = {
    ...sel,
    padding: "6px 10px",
    minWidth: 140,
    colorScheme: isDark ? "dark" : "light",
  };

  const isFiltered = dateFrom !== minDateStr || dateTo !== maxDateStr || site !== "All" || enso !== "All" || damage !== "All";

  // Format date for display tag: "1 Jan 2005"
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${Number(d)} ${MONTH_LABELS[Number(m) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div>
        <h2 className="text-base font-bold mb-1" style={{ color: isDark ? "#f1f5f9" : "#0D1F3C" }}>🥧 What the Data Tells Us at a Glance</h2>
        <p className="text-xs" style={{ color: isDark ? "#64748b" : "#4A6080" }}>
          Simple breakdowns of reef conditions, climate patterns, bleaching levels, and survey coverage. Use the filters below to slice the dataset.
        </p>
      </div>

      {/* ── Filter panel ──────────────────────────────── */}
      <div style={{ ...cardStyle, borderRadius: 16, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: textSec }}>
            Filter Charts
          </div>
          <div style={{ fontSize: 12, color: textSec }}>
            Showing <strong style={{ color: textPri }}>{filtered.length.toLocaleString()}</strong> of {rows.length.toLocaleString()} records
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>

          {/* Start Date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Start Date</div>
            <input
              type="date"
              value={dateFrom}
              min={minDateStr}
              max={dateTo}
              onChange={e => { if (e.target.value) setDateFrom(e.target.value); }}
              style={dateInput}
            />
          </div>

          {/* End Date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>End Date</div>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={maxDateStr}
              onChange={e => { if (e.target.value) setDateTo(e.target.value); }}
              style={dateInput}
            />
          </div>

          {/* Reef Site */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Reef Site</div>
            <select value={site} onChange={e => setSite(e.target.value)} style={{ ...sel, minWidth: 150 }}>
              <option value="All">All Sites</option>
              {allSites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ENSO Phase */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Climate Phase (ENSO)</div>
            <select value={enso} onChange={e => setEnso(e.target.value)} style={{ ...sel, minWidth: 120 }}>
              <option value="All">All Phases</option>
              {allEnsos.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Reef Condition */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Reef Condition</div>
            <select value={damage} onChange={e => setDamage(e.target.value)} style={{ ...sel, minWidth: 130 }}>
              <option value="All">All Conditions</option>
              {allDamage.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1).replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Reset */}
          {isFiltered && (
            <button
              onClick={() => { setDateFrom(minDateStr); setDateTo(maxDateStr); setSite("All"); setEnso("All"); setDamage("All"); }}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: isDark ? "#1a1a1a" : "#eff6ff", color: "#3b82f6", border: "1px solid #3b82f633", alignSelf: "flex-end" }}>
              Reset
            </button>
          )}
        </div>

        {/* Active filter tags */}
        {isFiltered && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {(dateFrom !== minDateStr || dateTo !== maxDateStr) && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#3b82f620", color: "#3b82f6", border: "1px solid #3b82f640" }}>
                {fmtDate(dateFrom)} → {fmtDate(dateTo)}
              </span>
            )}
            {site !== "All" && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#10b98120", color: "#10b981", border: "1px solid #10b98140" }}>
                {site}
              </span>
            )}
            {enso !== "All" && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#8b5cf620", color: "#8b5cf6", border: "1px solid #8b5cf640" }}>
                {enso}
              </span>
            )}
            {damage !== "All" && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
                {damage.replace("_", " ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Charts ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PieCard
          title="Reef Condition Breakdown"
          subtitle="How many observations fall into each reef health category."
          data={stats.damageState}
          isDark={isDark}
        />
        <PieCard
          title="Climate Phase (ENSO) Distribution"
          subtitle="Share of records during El Niño, La Niña, and Neutral ocean conditions."
          data={stats.ensoPhase}
          isDark={isDark}
          donut
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PieCard
          title="Bleaching Severity Spread"
          subtitle="What share of observations show no, low, moderate, high, or severe bleaching."
          data={stats.bleachSeverity}
          isDark={isDark}
        />
        <PieCard
          title="Observations per Reef Site"
          subtitle="How many records were collected at each monitored location."
          data={stats.siteObservations}
          isDark={isDark}
          donut
        />
      </div>

      <MonthlyBarCard data={stats.monthlyObservations} isDark={isDark} />
    </div>
  );
}

type GlobalOverviewContentProps = Readonly<{
  pageOne: {
    kpis: {
      globalRiskIndex: number;
      highRiskPercent: number;
      avgDHW: number;
      avgBleaching: number;
      totalSites: number;
    };
    geoClusterData?: GeoSite[];
    siteTimeSeries?: SiteTS[];
    waterQualityTimeSeries?: WaterQualityTS[];
    rawTableRows?: RawRow[];
  };
  isDark: boolean;
  selectedSite: string;
  setSelectedSite: React.Dispatch<React.SetStateAction<string>>;
  GRID: string;
  TICK: ChartTick;
  TT: React.CSSProperties;
  card: React.CSSProperties;
}>;

function GlobalOverviewContent({
  pageOne,
  isDark,
  selectedSite,
  setSelectedSite,
  GRID,
  TICK,
  TT,
  card,
}: GlobalOverviewContentProps) {
  const kpis = pageOne.kpis;
  const allSiteNames = ((pageOne.siteTimeSeries ?? []) as SiteTS[]).map((siteSeries) => siteSeries.site);
  const resolvedSite = selectedSite || allSiteNames[0] || "";

  return (
    <div className="relative space-y-6 p-4 md:p-6">
      <section
        className="relative overflow-hidden rounded-[30px] p-4 md:p-5"
        style={{
          ...card,
          background: isDark
            ? "linear-gradient(180deg, rgba(6,14,25,0.96) 0%, rgba(6,12,22,0.96) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(244,249,255,0.88) 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.24]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.76), rgba(255,255,255,0.24)), ${OCEAN_BG_IMAGE}`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-700 text-white shadow-[0_14px_30px_rgba(29,155,255,0.25)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12c2.2 0 2.2-1.5 4.4-1.5S10.6 12 12.8 12s2.2-1.5 4.4-1.5S19.4 12 21.6 12M4 16.5c2.2 0 2.2-1.5 4.4-1.5s2.2 1.5 4.4 1.5 2.2-1.5 4.4-1.5 2.2 1.5 4.4 1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-[19px] font-bold md:text-[21px]" style={{ color: isDark ? "#f1f5f9" : "#16325C" }}>
                Islandwide Reef Overview
              </h1>
              <p className="mt-1 text-sm" style={{ color: isDark ? "#94a3b8" : "#5F7B9E" }}>
                A clear summary of bleaching risk, heat stress, and reef conditions across monitored sites.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[24px] flex items-center justify-center px-3 py-3" style={{ ...card, minHeight: 144 }}>
              <RiskGauge value={kpis.globalRiskIndex} />
            </div>
            <KPICard title="High Risk Sites" value={`${kpis.highRiskPercent}%`} sub="Sites currently under high stress" gauge={kpis.highRiskPercent} isDark={isDark} accentKey="risk" />
            <KPICard title="Avg Heat Stress (DHW)" value={kpis.avgDHW} sub="Degree Heating Weeks" gauge={kpis.avgDHW * 5} isDark={isDark} accentKey="heat" />
            <KPICard title="Avg Bleaching" value={`${kpis.avgBleaching}%`} sub="Across all monitored sites" gauge={kpis.avgBleaching} isDark={isDark} accentKey="bleach" />
            <KPICard title="Total Sites" value={kpis.totalSites} sub="Monitored reef sites" isDark={isDark} accentKey="sites" />
          </div>
        </div>
      </section>

      <SriLankaMap geoData={(pageOne.geoClusterData ?? []) as GeoSite[]} isDark={isDark} card={card} />

      <SiteTimeSeriesCharts siteTimeSeries={(pageOne.siteTimeSeries ?? []) as SiteTS[]} isDark={isDark} card={card} GRID={GRID} TICK={TICK} TT={TT} selectedSite={resolvedSite} setSelectedSite={setSelectedSite} />

      <WaterQualityChart waterQualityTimeSeries={(pageOne.waterQualityTimeSeries ?? []) as WaterQualityTS[]} isDark={isDark} GRID={GRID} TICK={TICK} />

      <DatasetTable rows={(pageOne.rawTableRows ?? []) as RawRow[]} isDark={isDark} />

      <PieChartsSection rows={(pageOne.rawTableRows ?? []) as RawRow[]} isDark={isDark} />
    </div>
  );
}

export default function GlobalOverviewPage() {
  const { data, loading, error, isDark } = useDashboardData();
  const [selectedSite, setSelectedSite] = useState<string>("");

  const GRID = isDark ? "#1A1A1A" : "rgba(191,219,254,0.58)";
  const TICK = { fill: isDark ? "#4a6080" : "#7A95B6", fontSize: 11 as const };
  const TT = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 }
    : { background: "rgba(255,255,255,0.94)", border: "1px solid rgba(203,225,246,0.96)", borderRadius: "14px", color: "#334155", fontSize: 12, boxShadow: "0 16px 30px rgba(59,130,246,0.12)" };
  const card = getDashboardCardStyle(isDark);

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#030303" : "transparent", color: isDark ? "#94a3b8" : "#64748b" }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌊</div><div>Loading reef summary...</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  if (!data.page1?.kpis || !data.page1?.models) {
    return <div className="p-8 text-yellow-600">⚠ Page data not yet available. Check the API route or reload.</div>;
  }

  return <GlobalOverviewContent pageOne={data.page1} isDark={isDark} selectedSite={selectedSite} setSelectedSite={setSelectedSite} GRID={GRID} TICK={TICK} TT={TT} card={card} />;
}
