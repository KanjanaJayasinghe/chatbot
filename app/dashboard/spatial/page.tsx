// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2 – Spatial Risk Intelligence
//
// AI MODELS USED IN THIS PAGE:
//
//  1. K-Means Clustering (lib/models/kmeans.ts)
//     ├─ Chart: Geo Risk Zoning Scatter
//     │    Method : K-Means++ initialisation + Lloyd's algorithm
//     │    Features: Latitude, Longitude, SSTA, DHW_Stress, Bleaching_Percent
//     │    k = 3 clusters → High Risk / Medium Risk / Low Risk labels
//     │
//     └─ Chart: Spatial Autocorrelation (Moran's I concept)
//          Method : For each site, compare its bleaching to the mean of all
//                   other sites (global mean used as spatial lag approximation).
//
//  2. Simple Linear Regression (lib/models/linearRegression.ts)
//     └─ Chart: Distance to Shore Impact
//          Method : OLS – β = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²
//          X: Distance_to_Shore_km · Y: Bleaching_Percent
//          Trend line shows directional relationship (slope = %/km).
//
//  3. Binned Moving Average (descriptive, no ML model)
//     └─ Chart: Depth Sensitivity Curve
//          Method : Sort by Depth_m, bin into groups, compute mean Bleaching per bin.
//          Approximates a LOESS smoothed curve for depth-bleaching sensitivity.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useDashboardData } from "../useDashboardData";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

const CLUSTER_COLORS: Record<string, string> = {
  "High Risk": "#ef4444",
  "Medium Risk": "#eab308",
  "Low Risk": "#22c55e",
};

const OCEAN_BG_IMAGE = 'url("/Beautiful%20Coral%20Reef%20Ocean%20Background.png")';

type GeoSite = { site: string; cluster: string; bleaching: number; dhw: number; lat: number; lon: number };
type MapTooltip = { site: string; cluster: string; bleaching: number; dhw: number; x: number; y: number };

function getUniqueSites(geoData: GeoSite[]): GeoSite[] {
  const m = new Map<string, GeoSite>();
  for (const s of geoData) if (!m.has(s.site)) m.set(s.site, s);
  return Array.from(m.values());
}

function getRiskCounts(sites: GeoSite[]) {
  return ["High Risk", "Medium Risk", "Low Risk"].map((label) => ({
    label,
    count: sites.filter((s) => s.cluster === label).length,
  }));
}

function SiteMapTooltip({ tip, isDark }: Readonly<{ tip: MapTooltip | null; isDark: boolean }>) {
  if (!tip) return null;
  return (
    <div style={{
      position: "absolute",
      left: Math.min(tip.x + 16, 160),
      top: Math.max(tip.y - 64, 10),
      background: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.96)",
      border: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(203,225,246,0.9)",
      borderRadius: 16, padding: "10px 14px",
      boxShadow: "0 18px 34px rgba(15,23,42,0.18)",
      minWidth: 158, zIndex: 10, pointerEvents: "none", backdropFilter: "blur(14px)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: isDark ? "#f1f5f9" : "#16325C" }}>{tip.site}</div>
      <div style={{ fontSize: 11, color: CLUSTER_COLORS[tip.cluster], fontWeight: 700, margin: "4px 0" }}>{tip.cluster}</div>
      <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#5F7B9E" }}>Bleaching: <strong>{tip.bleaching}%</strong></div>
      <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#5F7B9E" }}>Heat Stress: <strong>{typeof tip.dhw === "number" ? tip.dhw.toFixed(1) : tip.dhw}</strong></div>
    </div>
  );
}

function ReefSiteMapCard({ geoData, isDark, card }: Readonly<{ geoData: GeoSite[]; isDark: boolean; card: React.CSSProperties }>) {
  const sites = getUniqueSites(geoData);
  const riskCounts = getRiskCounts(sites);

  return (
    <div className="relative overflow-hidden rounded-[30px] p-6" style={card}>
      {/* ocean bg overlay */}
      <div className="absolute inset-0 opacity-[0.18]" style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.42)), ${OCEAN_BG_IMAGE}`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
      <div className="relative">
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V6.618a1 1 0 01.553-.894L9 3m0 17l6-3m-6 3V3m6 14l6 3m-6-3V6m6 14V6m0 0l-6-3m6 3l-6 3m-6-3l6 3" />
              </svg>
            </div>
            <div>
              <h2 style={{ color: isDark ? "#f1f5f9" : "#16325C", fontWeight: 700, fontSize: 16, margin: 0 }}>
                Sri Lanka Reef Site Risk Map
              </h2>
              <p style={{ color: isDark ? "#64748b" : "#5F7B9E", fontSize: 12, marginTop: 4 }}>
                {sites.length} monitored reef sites around Sri Lanka — colored by risk cluster. Hover to inspect each site.
              </p>
            </div>
          </div>
          {/* risk counts top-right */}
          <div style={{ display: "flex", gap: 20 }}>
            {riskCounts.map(({ label, count }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: CLUSTER_COLORS[label] }}>{count}</div>
                <div style={{ fontSize: 10, color: isDark ? "#64748b" : "#5F7B9E" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          {/* PNG map image */}
          <div className="relative flex-shrink-0 overflow-hidden rounded-[24px]"
            style={{ width: 300, height: 460, boxShadow: isDark ? "none" : "0 18px 36px rgba(37,99,235,0.16)" }}>
            <img
              src="/Sri Lanka Reef Sites Map.png"
              alt="Sri Lanka Reef Sites Map"
              style={{ width: 300, height: 460, objectFit: "cover", display: "block", borderRadius: 24 }}
            />
          </div>

          {/* site list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: isDark ? "#475569" : "#4A6080", marginBottom: 12 }}>
              All Monitored Sites
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 430, overflowY: "auto", paddingRight: 4 }}>
              {sites.map((site) => {
                const color = CLUSTER_COLORS[site.cluster] ?? "#94a3b8";
                return (
                  <div key={site.site} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 18,
                    background: isDark ? "rgba(10,15,24,0.88)" : "rgba(255,255,255,0.84)",
                    border: isDark ? "1px solid rgba(148,163,184,0.12)" : "1px solid rgba(221,232,248,0.92)",
                    boxShadow: isDark ? "none" : "0 12px 24px rgba(59,130,246,0.08)",
                    transition: "all 0.15s", cursor: "default",
                  }}>
                    <div style={{ width: 11, height: 11, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}66` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#e2e8f0" : "#17365D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {site.site}
                      </div>
                      <div style={{ fontSize: 11, color: isDark ? "#64748b" : "#5F7B9E" }}>
                        {site.cluster} · {site.bleaching}% bleaching · DHW {typeof site.dhw === "number" ? site.dhw.toFixed(1) : site.dhw}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999, flexShrink: 0,
                      background: `${color}18`, color, border: `1px solid ${color}3A`,
                    }}>
                      {site.cluster.split(" ")[0]}
                    </div>
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

export default function SpatialPage() {
  const { data, loading, error, isDark } = useDashboardData();

  const GRID = isDark ? "#1A1A1A" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const TT = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#334155", fontSize: 12 };
  const card = {
    background: isDark
      ? "linear-gradient(180deg, #09101b 0%, #050b14 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(246,250,255,0.88) 100%)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(203,225,246,0.96)",
    boxShadow: isDark ? "none" : "0 20px 40px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#030303" : "transparent", color: isDark ? "#94a3b8" : "#64748b" }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🗺️</div><div>Loading reef location insights...</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p2 = data.page2;
  if (!p2?.models) {
    return <div className="p-8 text-yellow-600">⚠ Spatial data not available. Check the API route or reload.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="-mx-6 -mt-6 px-6 py-4 mb-2" style={{background:"transparent",border:"none"}}>
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#0D1F3C" }}>🗺️ Where Are Reefs Most at Risk?</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#4A6080" }}>Understand how location, depth, and distance from shore are linked to bleaching.</p>
      </div>

      {/* Sri Lanka Reef Site Risk Map Card */}
      <ReefSiteMapCard
        geoData={(p2.geoClusterData ?? []) as GeoSite[]}
        isDark={isDark}
        card={card}
      />

      {/* Geo Risk Zoning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🧭 Reef Location Risk Zones</h2>
            <p className="text-xs mb-3" style={{ color: "#64748b" }}>
              Sites are grouped into High, Medium, and Low risk areas based on similar bleaching and stress patterns.
              Use this view to choose where field teams should go first.
          </p>
          <div className="flex gap-3 mb-3">
            {Object.entries(CLUSTER_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1 text-xs" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="lon" name="Lon" tick={{ fill: "#94a3b8", fontSize: 11 }} label={{ value: "Longitude", position: "insideBottom", offset: -2, fill: "#94a3b8", fontSize: 11 }} />
              <YAxis dataKey="lat" name="Lat" tick={{ fill: "#94a3b8", fontSize: 11 }} label={{ value: "Latitude", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ ...TT, padding: "8px 10px" }}>
                      <div className="font-bold">{d.site}</div>
                      <div style={{ color: CLUSTER_COLORS[d.cluster] }}>{d.cluster}</div>
                      <div>Bleaching: {d.bleaching}% · DHW: {d.dhw?.toFixed(1)}</div>
                      <div>Temp: {d.temperature?.toFixed(1)}°C · Turbidity: {d.turbidity?.toFixed(1)}</div>
                    </div>
                  );
                }}
              />
              {["High Risk", "Medium Risk", "Low Risk"].map((c) => (
                <Scatter
                  key={c}
                  name={c}
                  data={((p2.geoClusterData ?? []) as {cluster:string}[]).filter((d) => d.cluster === c)}
                  fill={CLUSTER_COLORS[c]}
                  opacity={0.75}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌊 Do Nearby Reefs Bleach Together?</h2>
          <p className="text-xs mb-3" style={{ color: "#64748b" }}>
            This chart compares each reef site with nearby reef conditions.
            Points near the diagonal mean local reefs behave similarly, while far points mark unusual sites.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="x" name="Local Mean Bleaching" tick={TICK} label={{ value: "Local Mean Bleaching %", position: "insideBottom", offset: -2, ...TICK }} />
              <YAxis dataKey="y" name="Site Bleaching" tick={TICK} label={{ value: "Site Bleaching %", angle: -90, position: "insideLeft", ...TICK }} />
              <Tooltip content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ ...TT, padding: "8px 10px" }}>
                      <div>{d.site}</div>
                      <div>Nearby Reefs: {d.x?.toFixed(1)}% · This Site: {d.y?.toFixed(1)}%</div>
                    </div>
                  );
                }}
              />
              <Scatter data={p2.moranScatter ?? []} fill="#8b5cf6" opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distance Impact + Depth Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📏 Does Distance from Shore Affect Bleaching?</h2>
          <p className="text-xs mb-3" style={{ color: "#64748b" }}>
            The trend line shows whether reefs closer to shore or farther offshore tend to have more bleaching.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="x" name="Distance (km)" tick={TICK} label={{ value: "Distance to Shore (km)", position: "insideBottom", offset: -2, ...TICK }} />
              <YAxis dataKey="y" name="Bleaching %" tick={TICK} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", ...TICK }} />
              <Tooltip contentStyle={TT} />
              <Scatter data={p2.shoreScatter ?? []} fill="#06b6d4" opacity={0.5} name="Observations" />
              <Scatter data={p2.shoreTrend ?? []} fill="transparent" name="Trend Line" line={{ stroke: "#f59e0b", strokeWidth: 2 }} shape={() => null} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🧊 How Reef Depth Relates to Bleaching</h2>
          <p className="text-xs mb-3" style={{ color: "#64748b" }}>
            This curve shows average bleaching at different depths.
            It helps dive teams choose depth ranges for early monitoring.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={p2.depthBins ?? []} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="depth" tick={TICK} label={{ value: "Depth (m)", position: "insideBottom", offset: -2, ...TICK }} />
              <YAxis tick={TICK} label={{ value: "Avg Bleaching %", angle: -90, position: "insideLeft", ...TICK }} />
              <Tooltip contentStyle={TT} />
              <Legend />
              <Line type="monotone" dataKey="avgBleaching" stroke="#0d9488" strokeWidth={3} dot={{ fill: "#0d9488", r: 5 }} name="Avg Bleaching %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight box */}
      <div
        className="rounded-xl p-4"
        style={{
          background: isDark ? "rgba(59,130,246,0.08)" : "#eff6ff",
          border: isDark ? "1px solid rgba(59,130,246,0.2)" : "1px solid #bfdbfe",
        }}
      >
        <h3 className="font-semibold mb-2" style={{ color: isDark ? "#93c5fd" : "#1d4ed8" }}>🧭 What This Means for Field Teams</h3>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: isDark ? "#7dd3fc" : "#2563eb" }}>
          <li>Group nearby high-risk reefs into one patrol plan to save time and resources.</li>
          <li>Sites that differ from nearby reefs need closer checking for local causes such as runoff or pollution.</li>
          <li>Use the distance trend to decide whether nearshore or offshore patrols should be prioritized this season.</li>
          <li>Use the depth curve to target the depth bands where bleaching risk is rising fastest.</li>
        </ul>
      </div>
    </div>
  );
}
