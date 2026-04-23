// ─────────────────────────────────────────────────────────────────────────────
// PAGE 1 – Global Overview (Executive Intelligence)
//
// AI MODELS USED IN THIS PAGE:
//
//  1. K-Means Clustering (lib/models/kmeans.ts)
//     ├─ Chart: Geo Heatmap + K-Means Cluster Overlay (scatter map)
//     │    Method : K-Means++ initialisation → Lloyd's algorithm
//     │    k = 3  → cluster labels: High Risk / Medium Risk / Low Risk
//     │    Features: Lat, Lon, SSTA, DHW_Stress, Bleaching_Percent
//     │
//     └─ KPI: Global Risk Index
//          Derived from cluster centroids + bleaching mean per cluster.
//
//  2. Isolation Forest / IQR Outlier Detection (lib/models/isolationForest.ts)
//     └─ Chart: Bleaching Outlier Detection (Box Plot summary)
//          Method : IQR = Q3 − Q1; fences = Q1−1.5·IQR and Q3+1.5·IQR
//          Flags extreme bleaching values as statistical anomalies.
//
//  3. Pareto Analysis (descriptive, no ML model)
//     └─ Chart: Pareto Chart – 80/20 Bleaching
//          Ranks sites by total bleaching, computes cumulative % → 80/20 rule.
//
//  4. Multi-variable Bubble Chart (descriptive, no ML model)
//     └─ Scatter: Temperature × Bleaching × DHW (bubble size) × Turbidity (colour)
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useDashboardData } from "../useDashboardData";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine, ComposedChart, Area,
} from "recharts";

/* ── KPI Card ─────────────────────────────────────── */
function KPICard({ title, value, sub, gauge, isDark }: {
  title: string; value: string | number; sub: string; color?: string; gauge?: number; isDark?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: isDark ? "#0f1829" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0",
        boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <div className="text-xs uppercase tracking-wider" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{title}</div>
      <div className="text-3xl font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{value}</div>
      {gauge !== undefined && (
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: isDark ? "#1a2540" : "#e2e8f0" }}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${
              gauge > 60 ? "bg-red-500" : gauge > 35 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, gauge)}%` }}
          />
        </div>
      )}
      <div className="text-xs" style={{ color: isDark ? "#475569" : "#64748b" }}>{sub}</div>
    </div>
  );
}

/* ── Risk Gauge (semi-circle SVG) ─────────────────── */
function RiskGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const angle = (pct / 100) * 180 - 90; // -90 to 90 degrees
  const rad = (angle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 70;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const color = pct > 60 ? "#ef4444" : pct > 35 ? "#eab308" : "#22c55e";

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="110" viewBox="0 0 200 110">
        {/* Background arc */}
        <path d="M 30 90 A 70 70 0 0 1 170 90" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
        {/* Low */}
        <path d="M 30 90 A 70 70 0 0 1 100 20" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
        {/* Med */}
        <path d="M 100 20 A 70 70 0 0 1 155 42" fill="none" stroke="#eab308" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
        {/* High */}
        <path d="M 155 42 A 70 70 0 0 1 170 90" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        {/* Labels */}
        <text x="20" y="108" fill="#94a3b8" fontSize="10">Low</text>
        <text x="87" y="18" fill="#94a3b8" fontSize="10">Med</text>
        <text x="156" y="108" fill="#94a3b8" fontSize="10">High</text>
      </svg>
      <div className="text-2xl font-bold" style={{ color }}>{pct.toFixed(1)}</div>
      <div className="text-xs text-slate-500">Islandwide Reef Risk</div>
    </div>
  );
}

const CLUSTER_COLORS: Record<string, string> = {
  "High Risk": "#ef4444",
  "Medium Risk": "#eab308",
  "Low Risk": "#22c55e",
};

export default function GlobalOverviewPage() {
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
  const cardSm = {
    background: isDark ? "#0d1729" : "#f8fafc",
    border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#060d1f" : "#f8fafc", color: isDark ? "#94a3b8" : "#64748b" }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌊</div><div>Loading reef summary...</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p1 = data.page1;
  if (!p1?.kpis || !p1?.models) {
    return <div className="p-8 text-yellow-600">⚠ Page data not yet available. Check the API route or reload.</div>;
  }
  const kpis = p1.kpis;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div
        className="-mx-6 -mt-6 px-6 py-4 mb-2"
        style={{
          background: isDark ? "#040d1a" : "#ffffff",
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
        }}
      >
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌍 Islandwide Reef Overview</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>A clear summary of bleaching risk, heat stress, and reef conditions across monitored sites.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="col-span-2 lg:col-span-1 rounded-xl p-4 flex items-center justify-center" style={card}>
          <RiskGauge value={kpis.globalRiskIndex} />
        </div>
        <KPICard title="High Risk Sites" value={`${kpis.highRiskPercent}%`} sub="Sites currently under high stress" color="border-red-800" gauge={kpis.highRiskPercent} isDark={isDark} />
        <KPICard title="Avg Heat Stress (DHW)" value={kpis.avgDHW} sub="Degree Heating Weeks" color="border-orange-800" gauge={kpis.avgDHW * 5} isDark={isDark} />
        <KPICard title="Avg Bleaching" value={`${kpis.avgBleaching}%`} sub="Across all monitored sites" color="border-yellow-800" gauge={kpis.avgBleaching} isDark={isDark} />
        <KPICard title="Total Sites" value={kpis.totalSites} sub="Monitored reef sites" color="border-blue-800" isDark={isDark} />
      </div>

      {/* Row 2: Geo Cluster + Box Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Geo Cluster Scatter */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌎 Reef Site Risk Map</h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            Each point is a monitored reef site. Colors group sites with similar stress and bleaching patterns,
            helping teams quickly spot high-pressure zones.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="lon" name="Longitude" tick={TICK} label={{ value: "Longitude", position: "insideBottom", offset: -2, ...TICK }} />
              <YAxis dataKey="lat" name="Latitude" tick={TICK} label={{ value: "Latitude", angle: -90, position: "insideLeft", ...TICK }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ ...TT, padding: "8px 10px" }}>
                      <div style={{ fontWeight: 700 }}>{d.site}</div>
                      <div>Risk Group: <span style={{ color: CLUSTER_COLORS[d.cluster] }}>{d.cluster}</span></div>
                      <div>Bleaching: {d.bleaching}%</div>
                      <div>Heat Stress (DHW): {d.dhw}</div>
                    </div>
                  );
                }}
              />
              <Legend />
              {["High Risk", "Medium Risk", "Low Risk"].map((c) => (
                <Scatter
                  key={c}
                  name={c}
                  data={((p1.geoClusterData ?? []) as {cluster:string}[]).filter((d) => d.cluster === c)}
                  fill={CLUSTER_COLORS[c]}
                  opacity={0.7}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Outlier Box Plot Summary */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📉 Reefs with Unusually High Bleaching</h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            These are sites where bleaching is much higher than the normal range in the full dataset.
            We found <span className="text-red-400 font-bold">{p1.boxPlotData.outlierCount}</span> sites needing closer attention.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Lower 25%", value: p1.boxPlotData.q1?.toFixed(1) },
              { label: "Middle Value", value: p1.boxPlotData.median?.toFixed(1) },
              { label: "Upper 75%", value: p1.boxPlotData.q3?.toFixed(1) },
              { label: "Typical Spread", value: p1.boxPlotData.iqr?.toFixed(1) },
              { label: "Expected Low", value: p1.boxPlotData.lowerFence?.toFixed(1) },
              { label: "Expected High", value: p1.boxPlotData.upperFence?.toFixed(1) },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-2 text-center" style={cardSm}>
                <div className="text-xs" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{s.label}</div>
                <div className="text-lg font-bold" style={{ color: isDark ? "#2dd4bf" : "#0d9488" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="text-xs mb-1" style={{ color: isDark ? "#64748b" : "#64748b" }}>Top outlier bleaching values:</div>
          <div className="flex flex-wrap gap-1">
            {((p1.boxPlotData?.outlierValues ?? []) as number[]).slice(0, 15).map((v, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: isDark ? "1px solid rgba(239,68,68,0.25)" : "1px solid #fecaca", color: isDark ? "#fca5a5" : "#dc2626" }}>
                {v.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Pareto + Scatter Bubble */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pareto Chart */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📊 Which Sites Need Urgent Attention First?</h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>A small number of sites often account for most bleaching impact. The 80% line helps set visit priority.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={((p1.paretoData ?? []) as {site:string;bleaching:number;cumulativePct:number}[]).slice(0, 20)} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="site" tick={{ fill: TICK.fill, fontSize: 9 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis yAxisId="left" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={TICK} unit="%" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} />
              <Bar yAxisId="left" dataKey="bleaching" fill="#0e7490" name="Bleaching Impact" />
              <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative %" />
              <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "80%", fill: "#ef4444", fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter Bubble: Temp vs Bleaching vs DHW vs Turbidity */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🔗 How Heat, Turbidity, and Temperature Combine</h2>
          <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            X: Temperature. Y: Bleaching. Bubble size: Heat Stress (DHW). Color intensity: Turbidity.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="x" name="Temperature (°C)" tick={TICK} label={{ value: "Temperature °C", position: "insideBottom", offset: -2, ...TICK }} />
              <YAxis dataKey="y" name="Bleaching %" tick={TICK} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", ...TICK }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ ...TT, padding: "8px 10px" }}>
                      <div>{d.site}</div>
                      <div>Temp: {d.x}°C · Bleaching: {d.y}%</div>
                      <div>Heat Stress (DHW): {d.size?.toFixed(1)} · Turbidity: {d.color?.toFixed(1)}</div>
                    </div>
                  );
                }}
              />
              <Scatter
                data={p1.scatterBubble ?? []}
                fill="#06b6d4"
                opacity={0.65}
              >
                {((p1.scatterBubble ?? []) as {color:number}[]).map((entry, i) => (
                  <Cell key={i} fill={`hsl(${200 - entry.color * 8}, 80%, 55%)`} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
