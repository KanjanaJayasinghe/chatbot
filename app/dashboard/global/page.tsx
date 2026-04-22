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
function KPICard({ title, value, sub, color, gauge }: {
  title: string; value: string | number; sub: string; color: string; gauge?: number;
}) {
  return (
    <div className={`bg-gray-900 border ${color} rounded-xl p-4 flex flex-col gap-2`}>
      <div className="text-xs text-gray-400 uppercase tracking-wider">{title}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {gauge !== undefined && (
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${
              gauge > 60 ? "bg-red-500" : gauge > 35 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, gauge)}%` }}
          />
        </div>
      )}
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

/* ── Model Badge ─────────────────────────────────── */
function ModelBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs px-3 py-1.5 rounded-full">
      <span className="font-bold">🤖 {name}</span>
      <span className="text-cyan-500">·</span>
      <span className="text-cyan-400">{desc}</span>
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
        <path d="M 30 90 A 70 70 0 0 1 170 90" fill="none" stroke="#374151" strokeWidth="16" strokeLinecap="round" />
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
        <text x="20" y="108" fill="#6b7280" fontSize="10">Low</text>
        <text x="87" y="18" fill="#6b7280" fontSize="10">Med</text>
        <text x="156" y="108" fill="#6b7280" fontSize="10">High</text>
      </svg>
      <div className="text-2xl font-bold" style={{ color }}>{pct.toFixed(1)}</div>
      <div className="text-xs text-gray-500">Global Risk Index</div>
    </div>
  );
}

const CLUSTER_COLORS: Record<string, string> = {
  "High Risk": "#ef4444",
  "Medium Risk": "#eab308",
  "Low Risk": "#22c55e",
};

export default function GlobalOverviewPage() {
  const { data, loading, error } = useDashboardData();

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌊</div><div>Loading AI analysis…</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  // Guard: page1 key might be absent if the API computation failed partially
  const p1 = data.page1;
  if (!p1?.kpis || !p1?.models) {
    return <div className="p-8 text-yellow-400">⚠ Page data not yet available. Check the API route or reload.</div>;
  }
  const kpis = p1.kpis;
  // Safely resolve model metadata (populated by /api/dashboard from lib/models/*)
  const kmeansModel = p1.models.kmeans ?? { name: "K-Means", algorithm: "K-Means++ clustering", iterations: 0 };
  const ifModel = p1.models.isolationForest ?? { name: "IQR Outlier Detection", method: "Interquartile Range" };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🌍 Global Overview – Executive Intelligence</h1>
        <p className="text-gray-400 text-sm mt-1">AI-derived risk indices, anomaly detection, and multi-variable coral reef health insights.</p>
      </div>

      {/* Model badge — clearly identifies which AI model produces each section */}
      <div className="flex flex-wrap gap-2">
        <ModelBadge name={kmeansModel.name} desc={kmeansModel.algorithm} />
        <ModelBadge name={ifModel.name} desc={ifModel.method} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="col-span-2 lg:col-span-1 bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center justify-center">
          <RiskGauge value={kpis.globalRiskIndex} />
        </div>
        <KPICard title="High Risk Sites" value={`${kpis.highRiskPercent}%`} sub="Sites with Risk Score > 50%" color="border-red-800" gauge={kpis.highRiskPercent} />
        <KPICard title="Avg DHW" value={kpis.avgDHW} sub="Degree Heating Weeks" color="border-orange-800" gauge={kpis.avgDHW * 5} />
        <KPICard title="Avg Bleaching" value={`${kpis.avgBleaching}%`} sub="Bleaching percent" color="border-yellow-800" gauge={kpis.avgBleaching} />
        <KPICard title="Total Sites" value={kpis.totalSites} sub="Monitored reef sites" color="border-blue-800" />
      </div>

      {/* Row 2: Geo Cluster + Box Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Geo Cluster Scatter */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">🌎 Geo Heatmap + K-Means Cluster Overlay</h2>
          <p className="text-xs text-gray-500 mb-3">
            K-Means (k=3) clusters sites into High / Medium / Low risk zones using Lat, Lon, SSTA, DHW, Bleaching.
            Iteration count: {kmeansModel.iterations ?? "—"}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="lon" name="Longitude" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Longitude", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="lat" name="Latitude" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Latitude", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs text-white">
                      <div className="font-bold">{d.site}</div>
                      <div>Cluster: <span style={{ color: CLUSTER_COLORS[d.cluster] }}>{d.cluster}</span></div>
                      <div>Bleaching: {d.bleaching}%</div>
                      <div>DHW: {d.dhw}</div>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">📉 Bleaching Outlier Detection (IQR)</h2>
          <p className="text-xs text-gray-500 mb-3">
            IQR method: outliers are values beyond Q1−1.5·IQR or Q3+1.5·IQR fences.
            Detected <span className="text-red-400 font-bold">{p1.boxPlotData.outlierCount}</span> extreme reefs.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Q1", value: p1.boxPlotData.q1?.toFixed(1) },
              { label: "Median", value: p1.boxPlotData.median?.toFixed(1) },
              { label: "Q3", value: p1.boxPlotData.q3?.toFixed(1) },
              { label: "IQR", value: p1.boxPlotData.iqr?.toFixed(1) },
              { label: "Lower Fence", value: p1.boxPlotData.lowerFence?.toFixed(1) },
              { label: "Upper Fence", value: p1.boxPlotData.upperFence?.toFixed(1) },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-400">{s.label}</div>
                <div className="text-lg font-bold text-cyan-300">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mb-1">Top outlier bleaching values:</div>
          <div className="flex flex-wrap gap-1">
            {((p1.boxPlotData?.outlierValues ?? []) as number[]).slice(0, 15).map((v, i) => (
              <span key={i} className="bg-red-900/40 border border-red-700 text-red-300 text-xs px-2 py-0.5 rounded">
                {v.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Pareto + Scatter Bubble */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pareto Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">📊 Pareto Chart – 80/20 Bleaching Analysis</h2>
          <p className="text-xs text-gray-500 mb-3">Top 20% of sites cause 80% of cumulative bleaching damage.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={((p1.paretoData ?? []) as {site:string;bleaching:number;cumulativePct:number}[]).slice(0, 20)} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="site" tick={{ fill: "#9ca3af", fontSize: 9 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis yAxisId="left" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }}
              />
              <Bar yAxisId="left" dataKey="bleaching" fill="#0e7490" name="Total Bleaching" />
              <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative %" />
              <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "80%", fill: "#ef4444", fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter Bubble: Temp vs Bleaching vs DHW vs Turbidity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">🔗 Multi-variable Bubble Chart</h2>
          <p className="text-xs text-gray-500 mb-3">
            X: Temperature · Y: Bleaching % · Size: DHW Stress · Color intensity: Turbidity
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="x" name="Temperature (°C)" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Temperature °C", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="y" name="Bleaching %" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs text-white">
                      <div>{d.site}</div>
                      <div>Temp: {d.x}°C · Bleaching: {d.y}%</div>
                      <div>DHW: {d.size?.toFixed(1)} · Turbidity: {d.color?.toFixed(1)}</div>
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
