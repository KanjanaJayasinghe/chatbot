// ─────────────────────────────────────────────────────────────────────────────
// PAGE 3 – Temporal Forecasting
//
// AI MODELS USED IN THIS PAGE:
//
//  1. ARIMA(2,1,1) Time Series Model  (lib/models/arima.ts)
//     ├─ Chart: ARIMA Forecast (5-Year Horizon)
//     │    p=2 : AutoRegressive — uses last 2 observed values
//     │    d=1 : 1st-difference to remove trend non-stationarity
//     │    q=1 : Moving Average — 1 past residual term
//     │    AR coefficients: Levinson-Durbin algorithm (Yule-Walker equations)
//     │    CI  : ±1.96·σ·√h (95% confidence interval for h-step ahead)
//     │
//     └─ Chart: Seasonal Decomposition (STL-like)
//          Method : seasonalDecompose() from lib/models/arima.ts
//          Separates monthly mean, trend (12-month moving average), residuals.
//
//  2. Lag Correlation Analysis (lib/models/arima.ts → lagCorrelation())
//     └─ Chart: DHW–Bleaching Lag Correlation Bar Chart
//          Method : Pearson r between DHW_Stress[t−lag] and Bleaching[t]
//          Identifies time delays between thermal stress and bleaching response.
//
//  3. Multi-variable Line Chart (descriptive, no ML model)
//     └─ Overlays historical Temperature, Bleaching %, DHW Stress over time.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useDashboardData } from "../useDashboardData";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ModelBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-purple-950 border border-purple-800 text-purple-300 text-xs px-3 py-1.5 rounded-full">
      <span className="font-bold">🤖 {name}</span>
      <span className="text-purple-500">·</span>
      <span className="text-purple-400">{desc}</span>
    </div>
  );
}

export default function TemporalPage() {
  const { data, loading, error } = useDashboardData();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400"><div className="text-center"><div className="text-4xl mb-3 animate-pulse">📈</div><div>Running ARIMA forecast…</div></div></div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const p3 = data.page3;
  if (!p3?.arimaForecast?.pastYears || !p3?.models?.arima) {
    return <div className="p-8 text-yellow-400">⚠ Temporal forecast data not available. Check the API route or reload.</div>;
  }
  const arimaModel = p3.models.arima;

  // Build forecast chart data: past + future
  const forecastChartData = [
    ...p3.arimaForecast.pastYears.map((y: number, i: number) => ({
      year: y, actual: p3.arimaForecast.pastBleaching[i], forecast: null, lower: null, upper: null,
    })),
    ...p3.arimaForecast.forecastYears.map((y: number, i: number) => ({
      year: y, actual: null,
      forecast: p3.arimaForecast.forecast?.[i] ?? null,
      lower: p3.arimaForecast.lower?.[i] ?? null,
      upper: p3.arimaForecast.upper?.[i] ?? null,
    })),
  ];

  // Multi-variable chart
  const multiLineData = p3.timeSeries.map((r: {year:number;avgBleaching:number;avgTemp:number;avgDHW:number}) => ({
    year: r.year, bleaching: r.avgBleaching, temperature: r.avgTemp, dhw: r.avgDHW,
  }));

  // Seasonality
  const seasonalData = MONTH_NAMES.map((m, i) => ({
    month: m, bleaching: +(p3.monthlySeasonality?.[i] ?? 0).toFixed(2),
  }));

  // Lag correlation
  const lagData = ((p3.lagCorrelation ?? []) as {lag:number;correlation:number}[]).map((r) => ({
    lag: `Lag ${r.lag}`, correlation: +r.correlation.toFixed(3),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📈 Temporal Forecasting – ARIMA AI</h1>
        <p className="text-gray-400 text-sm mt-1">What will happen next? Time-series forecasting with confidence intervals.</p>
      </div>

      {/* Model explainer */}
      <div className="bg-purple-950/40 border border-purple-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ModelBadge name={arimaModel.name} desc="Time Series Forecasting" />
        </div>
        <p className="text-xs text-purple-300 leading-relaxed">{arimaModel.description}</p>
        <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
          <div className="bg-purple-900/40 rounded-lg p-2">
            <div className="text-purple-400 font-bold">AR(2)</div>
            <div className="text-gray-400">AutoRegressive: uses last 2 time steps. Coefficients via Yule-Walker / Levinson-Durbin equations.</div>
          </div>
          <div className="bg-purple-900/40 rounded-lg p-2">
            <div className="text-purple-400 font-bold">I(1)</div>
            <div className="text-gray-400">1st-order differencing: Δy_t = y_t − y_{"{t-1}"}. Removes non-stationarity (trend).</div>
          </div>
          <div className="bg-purple-900/40 rounded-lg p-2">
            <div className="text-purple-400 font-bold">MA(1)</div>
            <div className="text-gray-400">Moving Average: dampened correction using past residuals to smooth predictions.</div>
          </div>
        </div>
      </div>

      {/* Forecast chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold text-white mb-1">🔮 ARIMA Bleaching Forecast (5-Year Horizon)</h2>
        <p className="text-xs text-gray-500 mb-3">
          Solid line = historical observed. Dashed = ARIMA(2,1,1) forecast. Shaded band = 95% confidence interval (±1.96·σ·√h).
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecastChartData} margin={{ right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Avg Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
            <Legend />
            <ReferenceLine x={p3.arimaForecast.pastYears?.[p3.arimaForecast.pastYears.length - 1]} stroke="#4b5563" strokeDasharray="4 4" label={{ value: "Forecast →", fill: "#6b7280", fontSize: 10 }} />
            <Line type="monotone" dataKey="actual" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} name="Historical (Observed)" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: "#a855f7" }} name="ARIMA Forecast" connectNulls={false} />
            <Line type="monotone" dataKey="upper" stroke="#6b7280" strokeWidth={1} strokeDasharray="2 4" dot={false} name="95% CI Upper" connectNulls={false} />
            <Line type="monotone" dataKey="lower" stroke="#6b7280" strokeWidth={1} strokeDasharray="2 4" dot={false} name="95% CI Lower" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 2: Multi-variable + Seasonality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">🌡️ Multi-variable Cause Tracking</h2>
          <p className="text-xs text-gray-500 mb-3">Temperature, Bleaching, and DHW trends over time. Hover for synchronised values.</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={multiLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="bleaching" stroke="#f87171" strokeWidth={2} dot={false} name="Bleaching %" />
              <Line type="monotone" dataKey="temperature" stroke="#fb923c" strokeWidth={2} dot={false} name="Temperature °C" />
              <Line type="monotone" dataKey="dhw" stroke="#facc15" strokeWidth={2} dot={false} name="DHW Stress" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">📊 Seasonal Pattern (Monthly Avg Bleaching)</h2>
          <p className="text-xs text-gray-500 mb-3">Monthly decomposition shows within-year seasonality. Peak bleaching months indicate high thermal stress seasons.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Avg Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
              <Bar dataKey="bleaching" fill="#22d3ee" name="Avg Bleaching %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lag Correlation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold text-white mb-1">📉 Lag Correlation: DHW → Bleaching</h2>
        <p className="text-xs text-gray-500 mb-3">
          Cross-correlation at each lag shows how many time steps DHW leads bleaching.
          Peak correlation at lag k means DHW today predicts bleaching k years later.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={lagData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="lag" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis domain={[-1, 1]} tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Correlation", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#4b5563" />
            <Bar dataKey="correlation" name="Cross-Correlation" radius={[4, 4, 0, 0]}>
              {lagData.map((entry, i) => (
                <rect key={i} fill={entry.correlation > 0 ? "#22d3ee" : "#f87171"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Early warning */}
      <div className="bg-orange-950 border border-orange-800 rounded-xl p-4">
        <h3 className="text-orange-300 font-semibold mb-2">⚠️ Early Warning System</h3>
        <div className="text-sm text-orange-200 space-y-1">
          <p>ARIMA forecast uses the full historical trend to predict future bleaching. When the forecast line crosses the <span className="text-red-400 font-bold">30% danger threshold</span>, it signals a bleaching alert event.</p>
          <p className="text-xs text-orange-400 mt-2">Decision support: Activate monitoring protocols when forecasted bleaching {'>'} 30%.</p>
        </div>
      </div>
    </div>
  );
}
