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
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";

const CLUSTER_COLORS: Record<string, string> = {
  "High Risk": "#ef4444",
  "Medium Risk": "#eab308",
  "Low Risk": "#22c55e",
};

// ModelBadge: visible UI label for each AI model used on this page
function ModelBadge({ name, desc, isDark }: { name: string; desc: string; isDark?: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
      style={{
        background: isDark ? "rgba(20,184,166,0.12)" : "#f0fdfa",
        border: isDark ? "1px solid rgba(20,184,166,0.25)" : "1px solid #99f6e4",
        color: isDark ? "#5eead4" : "#0f766e",
      }}
    >
      <span className="font-bold">🤖 {name}</span>
      <span style={{ color: isDark ? "#2dd4bf" : "#2dd4bf" }}>·</span>
      <span>{desc}</span>
    </div>
  );
}

// SectionModelTag: shown inside each chart section to identify the AI model
function SectionModelTag({ model, method, isDark }: { model: string; method: string; isDark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ml-2"
      style={{
        background: isDark ? "rgba(20,184,166,0.1)" : "#f0fdfa",
        border: isDark ? "1px solid rgba(20,184,166,0.2)" : "1px solid #99f6e4",
        color: isDark ? "#5eead4" : "#0f766e",
      }}
    >
      MODEL: {model} · {method}
    </span>
  );
}

export default function SpatialPage() {
  const { data, loading, error, isDark } = useDashboardData();

  const GRID = isDark ? "#1a2540" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const TT = isDark
    ? { background: "#0d1729", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#334155", fontSize: 12 };
  const card = {
    background: isDark ? "#0f1829" : "#ffffff",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0",
    boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#060d1f" : "#f8fafc", color: isDark ? "#94a3b8" : "#64748b" }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🗺️</div><div>Loading Spatial AI…</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p2 = data.page2;
  if (!p2?.models) {
    return <div className="p-8 text-yellow-600">⚠ Spatial data not available. Check the API route or reload.</div>;
  }
  const kmeansModel = p2.models.kmeans ?? { name: "K-Means Clustering", description: "K-Means++ geo risk zoning" };

  return (
    <div className="p-6 space-y-6">
      <div
        className="-mx-6 -mt-6 px-6 py-4 mb-2"
        style={{ background: isDark ? "#040d1a" : "#ffffff", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0" }}
      >
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🗺️ Spatial Risk Intelligence – Geo-AI</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Where exactly are the risks, and why geographically?</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ModelBadge name={kmeansModel.name} desc={kmeansModel.description} isDark={isDark} />
      </div>

      {/* Geo Risk Zoning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-4" style={card}>
          {/* AI MODEL: K-Means Clustering */}
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            🧠 Geo Risk Zoning (K-Means Clustering)
            <SectionModelTag model="K-Means++" method="Lloyd's Algorithm k=3" isDark={isDark} />
          </h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
              K-Means (k=3) partitions sites into High / Medium / Low risk zones using geographic coordinates + environmental stress indicators.
              Toggle clusters to focus on specific zones.
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
          {/* AI MODEL: Global spatial lag (simplified Moran’s I) */}
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            🌊 Spatial Autocorrelation (Moran&apos;s I)
            <SectionModelTag model="Spatial Lag" method="Global Mean Approximation" isDark={isDark} />
          </h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            Do nearby reefs bleach similarly? Points above the diagonal → positive spatial autocorrelation (High-High clusters).
            Points far off-diagonal → spatial outliers.
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
                      <div>Local Mean: {d.x?.toFixed(1)}% · Site: {d.y?.toFixed(1)}%</div>
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
          {/* AI MODEL: Simple Linear Regression (OLS) */}
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            📏 Distance to Shore Impact (OLS Linear Regression)
            <SectionModelTag model="SimpleLinearRegression" method="OLS β-estimate" isDark={isDark} />
          </h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            OLS regression trend line shows how bleaching changes with distance from shore.
            Slope = {data.page2.shoreTrend?.[1] ? ((data.page2.shoreTrend[1].y - data.page2.shoreTrend[0].y) / (data.page2.shoreTrend[1].x - data.page2.shoreTrend[0].x || 1)).toFixed(3) : "N/A"} %/km
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
          {/* Binned moving average */}
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            🧊 Depth Sensitivity Curve (Binned Avg)
            <SectionModelTag model="Bin Average" method="Moving Window ±10m" isDark={isDark} />
          </h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            Binned moving average (window ±10m) reveals the nonlinear bleaching-depth relationship.
            Shallow reefs typically experience higher thermal stress.
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
        <h3 className="font-semibold mb-2" style={{ color: isDark ? "#93c5fd" : "#1d4ed8" }}>🧠 Spatial Decision Support</h3>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: isDark ? "#7dd3fc" : "#2563eb" }}>
          <li>K-Means clusters reveal contiguous geographic zones with similar risk profiles → treat them together for efficiency.</li>
          <li>High-High zones in the Moran scatter indicate bleaching hotspot clusters – prioritise these for intervention.</li>
          <li>The distance regression identifies whether nearshore or offshore reefs are more vulnerable in this ecosystem.</li>
          <li>Depth sensitivity guides monitoring depth priorities for conservation divers.</li>
        </ul>
      </div>
    </div>
  );
}
