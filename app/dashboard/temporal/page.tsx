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

export default function TemporalPage() {
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
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">📈</div><div>Loading future bleaching outlook...</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p3 = data.page3;
  if (!p3?.arimaForecast?.pastYears || !p3?.models?.arima) {
    return <div className="p-8 text-yellow-600">⚠ Temporal forecast data not available. Check the API route or reload.</div>;
  }

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
    lag: `${r.lag}-year delay`, correlation: +r.correlation.toFixed(3),
  }));

  return (
    <div className="p-6 space-y-6">
      <div
        className="-mx-6 -mt-6 px-6 py-4 mb-2"
        style={{ background: isDark ? "#040d1a" : "#ffffff", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0" }}
      >
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📈 Future Bleaching Outlook</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>See likely bleaching levels for the next 5 years and plan early action.</p>
      </div>
      <div
        className="rounded-xl p-4"
        style={{ background: isDark ? "rgba(168,85,247,0.08)" : "#faf5ff", border: isDark ? "1px solid rgba(168,85,247,0.2)" : "1px solid #e9d5ff" }}
      >
        <p className="text-xs leading-relaxed" style={{ color: isDark ? "#c4b5fd" : "#6b21a8" }}>
          The forecast combines long-term history and recent conditions to estimate likely bleaching levels.
          Use it as an early planning signal, not a fixed outcome.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg p-2" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
            <div className="font-bold" style={{ color: isDark ? "#d8b4fe" : "#7e22ce" }}>Past Trend</div>
            <div style={{ color: "#64748b" }}>Shows how bleaching changed over previous years.</div>
          </div>
          <div className="rounded-lg p-2" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
            <div className="font-bold" style={{ color: isDark ? "#d8b4fe" : "#7e22ce" }}>Expected Path</div>
            <div style={{ color: "#64748b" }}>Central estimate of what bleaching may look like next.</div>
          </div>
          <div className="rounded-lg p-2" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
            <div className="font-bold" style={{ color: isDark ? "#d8b4fe" : "#7e22ce" }}>Likely Range</div>
            <div style={{ color: isDark ? "#94a3b8" : "#6b7280" }}>Upper and lower bounds show uncertainty in the outlook.</div>
          </div>
        </div>
      </div>

      {/* Forecast chart */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🔮 Bleaching Outlook for the Next 5 Years</h2>
        <p className="text-xs mb-3" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          Solid line shows past bleaching. Dashed line shows expected future levels. The light band shows the likely range.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecastChartData} margin={{ right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} />
            <YAxis tick={TICK} label={{ value: "Avg Bleaching %", angle: -90, position: "insideLeft", ...TICK }} />
            <Tooltip contentStyle={TT} />
            <Legend />
            <ReferenceLine x={p3.arimaForecast.pastYears?.[p3.arimaForecast.pastYears.length - 1]} stroke={isDark ? "#334155" : "#cbd5e1"} strokeDasharray="4 4" label={{ value: "Future →", fill: TICK.fill, fontSize: 10 }} />
            <Line type="monotone" dataKey="actual" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="Past trend" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: "#a855f7" }} name="Expected trend" connectNulls={false} />
            <Line type="monotone" dataKey="upper" stroke={isDark ? "#475569" : "#94a3b8"} strokeWidth={1} strokeDasharray="2 4" dot={false} name="Likely upper range" connectNulls={false} />
            <Line type="monotone" dataKey="lower" stroke={isDark ? "#475569" : "#94a3b8"} strokeWidth={1} strokeDasharray="2 4" dot={false} name="Likely lower range" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 2: Multi-variable + Seasonality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌡️ Bleaching, Temperature, and Heat Stress Over Time</h2>
          <p className="text-xs mb-3" style={{ color: "#64748b" }}>Track how key conditions changed year by year.</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={multiLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip contentStyle={TT} />
              <Legend />
              <Line type="monotone" dataKey="bleaching" stroke="#f87171" strokeWidth={2} dot={false} name="Bleaching %" />
              <Line type="monotone" dataKey="temperature" stroke="#fb923c" strokeWidth={2} dot={false} name="Temperature °C" />
              <Line type="monotone" dataKey="dhw" stroke="#eab308" strokeWidth={2} dot={false} name="Heat Stress (DHW)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📊 Typical Bleaching by Month</h2>
          <p className="text-xs mb-3" style={{ color: "#64748b" }}>Shows months that usually have higher bleaching pressure.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="month" tick={TICK} />
              <YAxis tick={TICK} label={{ value: "Avg Bleaching %", angle: -90, position: "insideLeft", ...TICK }} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="bleaching" fill="#0d9488" name="Monthly avg bleaching" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lag Correlation */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📉 How Heat Stress Leads Future Bleaching</h2>
        <p className="text-xs mb-3" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          This chart shows how current heat stress is linked with bleaching after 0 to several years.
          Higher bars mean a stronger link.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={lagData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="lag" tick={TICK} />
            <YAxis domain={[-1, 1]} tick={TICK} label={{ value: "Relationship strength", angle: -90, position: "insideLeft", ...TICK }} />
            <Tooltip contentStyle={TT} />
            <ReferenceLine y={0} stroke={isDark ? "#334155" : "#cbd5e1"} />
            <Bar dataKey="correlation" name="Heat-to-bleaching link" radius={[4, 4, 0, 0]} fill="#0d9488" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Early warning */}
      <div
        className="rounded-xl p-4"
        style={{ background: isDark ? "rgba(249,115,22,0.08)" : "#fff7ed", border: isDark ? "1px solid rgba(249,115,22,0.2)" : "1px solid #fed7aa" }}
      >
        <h3 className="font-semibold mb-2" style={{ color: isDark ? "#fb923c" : "#c2410c" }}>⚠️ Early Action Guide</h3>
        <div className="text-sm space-y-1" style={{ color: isDark ? "#fdba74" : "#9a3412" }}>
          <p>• If expected bleaching rises above 30% in a coming year, schedule extra reef surveys early.</p>
          <p>• If the strongest link is at 1-2 years delay, current heat stress can signal near-future bleaching pressure.</p>
          <p>• Months with regular peaks should have pre-season action plans, field teams, and response budgets ready.</p>
          <p>• A wide likely range means higher uncertainty, so add more field checks and sensor coverage.</p>
        </div>
      </div>
    </div>
  );
}
