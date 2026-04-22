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
function ModelBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs px-3 py-1.5 rounded-full">
      <span className="font-bold">🤖 {name}</span>
      <span className="text-cyan-500">·</span>
      <span className="text-cyan-400">{desc}</span>
    </div>
  );
}

// SectionModelTag: shown inside each chart section to identify the AI model
function SectionModelTag({ model, method }: { model: string; method: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-cyan-900/50 border border-cyan-700/60 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded ml-2">
      MODEL: {model} · {method}
    </span>
  );
}

export default function SpatialPage() {
  const { data, loading, error } = useDashboardData();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400"><div className="text-center"><div className="text-4xl mb-3 animate-pulse">🗺️</div><div>Loading Spatial AI…</div></div></div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const p2 = data.page2;
  if (!p2?.models) {
    return <div className="p-8 text-yellow-400">⚠ Spatial data not available. Check the API route or reload.</div>;
  }
  const kmeansModel = p2.models.kmeans ?? { name: "K-Means Clustering", description: "K-Means++ geo risk zoning" };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🗺️ Spatial Risk Intelligence – Geo-AI</h1>
        <p className="text-gray-400 text-sm mt-1">Where exactly are the risks, and why geographically?</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ModelBadge name={kmeansModel.name} desc={kmeansModel.description} />
      </div>

      {/* Geo Risk Zoning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {/* AI MODEL: K-Means Clustering (lib/models/kmeans.ts)
              K-Means++ init + Lloyd's algorithm, k=3 clusters
              Features: Lat, Lon, SSTA, DHW_Stress, Bleaching_Percent */}
          <h2 className="font-semibold text-white mb-1">
            🧠 Geo Risk Zoning (K-Means Clustering)
            <SectionModelTag model="K-Means++" method="Lloyd's Algorithm k=3" />
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            K-Means (k=3) partitions sites into High / Medium / Low risk zones using geographic coordinates + environmental stress indicators.
            Toggle clusters to focus on specific zones.
          </p>
          <div className="flex gap-3 mb-3">
            {Object.entries(CLUSTER_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1 text-xs text-gray-300">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="lon" name="Lon" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Longitude", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="lat" name="Lat" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Latitude", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs text-white">
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

        {/* Spatial Autocorrelation – Moran's I concept */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {/* AI MODEL: Global spatial lag (simplified Moran's I)
              Each site's bleaching compared to global mean as the spatial lag proxy */}
          <h2 className="font-semibold text-white mb-1">
            🌊 Spatial Autocorrelation (Moran&apos;s I)
            <SectionModelTag model="Spatial Lag" method="Global Mean Approximation" />
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Do nearby reefs bleach similarly? Points above the diagonal → positive spatial autocorrelation (High-High clusters).
            Points far off-diagonal → spatial outliers.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="x" name="Local Mean Bleaching" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Local Mean Bleaching %", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="y" name="Site Bleaching" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Site Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs text-white">
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

        {/* Distance regression */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {/* AI MODEL: Simple Linear Regression (lib/models/linearRegression.ts)
              OLS: β = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²
              X = Distance_to_Shore_km, Y = Bleaching_Percent */}
          <h2 className="font-semibold text-white mb-1">
            📏 Distance to Shore Impact (OLS Linear Regression)
            <SectionModelTag model="SimpleLinearRegression" method="OLS β-estimate" />
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            OLS regression trend line shows how bleaching changes with distance from shore.
            Slope = {data.page2.shoreTrend?.[1] ? ((data.page2.shoreTrend[1].y - data.page2.shoreTrend[0].y) / (data.page2.shoreTrend[1].x - data.page2.shoreTrend[0].x || 1)).toFixed(3) : "N/A"} %/km
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="x" name="Distance (km)" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Distance to Shore (km)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="y" name="Bleaching %" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 11 }} />
              <Scatter data={p2.shoreScatter ?? []} fill="#06b6d4" opacity={0.5} name="Observations" />
              <Scatter data={p2.shoreTrend ?? []} fill="transparent" name="Trend Line" line={{ stroke: "#f59e0b", strokeWidth: 2 }} shape={() => null} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Depth Sensitivity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {/* Binned moving average — data sorted by Depth_m, grouped into bins, mean per bin.
              No ML model; approximates LOESS smoothed curve. */}
          <h2 className="font-semibold text-white mb-1">
            🧊 Depth Sensitivity Curve (Binned Avg)
            <SectionModelTag model="Bin Average" method="Moving Window ±10m" />
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Binned moving average (window ±10m) reveals the nonlinear bleaching-depth relationship.
            Shallow reefs typically experience higher thermal stress.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={p2.depthBins ?? []} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="depth" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Depth (m)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Avg Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="avgBleaching" stroke="#22d3ee" strokeWidth={3} dot={{ fill: "#22d3ee", r: 5 }} name="Avg Bleaching %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight box */}
      <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
        <h3 className="text-blue-300 font-semibold mb-2">🧠 Spatial Decision Support</h3>
        <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
          <li>K-Means clusters reveal contiguous geographic zones with similar risk profiles → treat them together for efficiency.</li>
          <li>High-High zones in the Moran scatter indicate bleaching hotspot clusters – prioritise these for intervention.</li>
          <li>The distance regression identifies whether nearshore or offshore reefs are more vulnerable in this ecosystem.</li>
          <li>Depth sensitivity guides monitoring depth priorities for conservation divers.</li>
        </ul>
      </div>
    </div>
  );
}
