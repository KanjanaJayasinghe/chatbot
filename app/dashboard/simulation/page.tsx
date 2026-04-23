// PAGE 5 – Decision Support & Simulation
"use client";
import { useDashboardData } from "../useDashboardData";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine, LabelList,
} from "recharts";

// ── SVG Gauge ────────────────────────────────────────────────────────────────
function ptXY(cx: number, cy: number, r: number, pct: number) {
  const a = Math.PI * (1 - pct);
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}
function arcSeg(cx: number, cy: number, r: number, p0: number, p1: number) {
  const s = ptXY(cx, cy, r, p0), e = ptXY(cx, cy, r, p1);
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${r} ${r} 0 ${p1-p0>0.5?1:0} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
function GaugeChart({ value, isDark }: { value: number; isDark?: boolean }) {
  const pct = Math.min(Math.max(value / 100, 0), 1);
  const cx = 120, cy = 108, r = 84, sw = 16;
  const n = ptXY(cx, cy, 68, pct);
  return (
    <svg viewBox="0 0 240 126" className="w-full max-w-[260px] mx-auto block">
      <path d={arcSeg(cx,cy,r,0,1)} fill="none" stroke={isDark ? "#1a2540" : "#e2e8f0"} strokeWidth={sw+6} strokeLinecap="round" />
      <path d={arcSeg(cx,cy,r,0,0.25)}   fill="none" stroke="#22c55e" strokeWidth={sw} />
      <path d={arcSeg(cx,cy,r,0.25,0.5)} fill="none" stroke="#eab308" strokeWidth={sw} />
      <path d={arcSeg(cx,cy,r,0.5,0.75)} fill="none" stroke="#f97316" strokeWidth={sw} />
      <path d={arcSeg(cx,cy,r,0.75,1)}   fill="none" stroke="#ef4444" strokeWidth={sw} />
      <line x1={cx} y1={cy} x2={n.x.toFixed(2)} y2={n.y.toFixed(2)} stroke={isDark ? "#f1f5f9" : "#1e293b"} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="8" fill={isDark ? "#f1f5f9" : "#1e293b"} />
      <circle cx={cx} cy={cy} r="4" fill={isDark ? "#0d1729" : "white"} />
    </svg>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, isDark }: { title: string; subtitle: string; isDark?: boolean }) {
  return (
    <header className="px-6 py-3 flex items-center justify-between shrink-0" style={{ background: isDark ? "#040d1a" : "#ffffff", borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: isDark ? "#f1f5f9" : "#334155" }}>{title}</span>
        <svg className="w-4 h-4" style={{ color: isDark ? "#4a6080" : "#94a3b8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-xs" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>{subtitle}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? "#4a6080" : "#64748b" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          2000–2026 · 2,000 records
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </span>
        <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center select-none">AD</div>
      </div>
    </header>
  );
}

export default function SimulationPage() {
  const { data, loading, error, isDark } = useDashboardData();
  const GRID = isDark ? "#1a2540" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 10 as const };
  const TT = isDark ? { background: "#0d1729", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 } : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: 12, color: "#334155" };
  const card = { background: isDark ? "#0f1829" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0", boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.05)" };
  const [tempDelta,     setTempDelta]     = useState(0);
  const [turbReduction, setTurbReduction] = useState(45);
  const [pH,            setPH]            = useState(8.1);
  const [dhw,           setDhw]           = useState(3);

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#060d1f" : "#f8fafc", color: isDark ? "#94a3b8" : "#64748b" }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🧠</div><p>Loading prediction model…</p></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p5 = data.page5;
  if (!p5?.models?.multipleLinearRegression)
    return <div className="p-8 text-yellow-600">⚠ Simulation model data not available.</div>;

  void p5.models.multipleLinearRegression;
  const weights: number[] = p5.mlrCoefficients ?? [];
  const bias: number      = p5.mlrBias ?? 0;
  const baseTemp = 29, finalTemp = baseTemp + tempDelta;
  const finalTurb = Math.max(0, 2.5 * (1 - turbReduction / 100));

  function calc(t: number, p: number, turb: number, d: number) {
    if (weights.length < 4) return 20;
    return Math.max(0, Math.min(100, weights[0]*t + weights[1]*p + weights[2]*turb + weights[3]*d + bias));
  }
  const pred = calc(finalTemp, pH, finalTurb, dhw);
  const riskLabel = pred > 50 ? "Critical" : pred > 25 ? "High" : pred > 10 ? "Moderate" : "Low";
  const riskColor = pred > 50 ? "#ef4444" : pred > 25 ? "#f97316" : pred > 10 ? "#eab308" : "#22c55e";
  const riskBadge = pred > 50 ? "bg-red-50 text-red-700 border-red-200" : pred > 25 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200";
  const riskAlert = pred > 50 ? "bg-red-50 border-red-200 text-red-700" : pred > 25 ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-green-50 border-green-200 text-green-700";

  const interventionData = [
    { scenario: "Baseline",       bleaching: parseFloat(pred.toFixed(1)) },
    { scenario: "+1°C Warming",   bleaching: parseFloat(calc(finalTemp+1, pH, finalTurb,      dhw).toFixed(1)) },
    { scenario: "+2°C Warming",   bleaching: parseFloat(calc(finalTemp+2, pH, finalTurb,      dhw).toFixed(1)) },
    { scenario: "−50% Turbidity", bleaching: parseFloat(calc(finalTemp,   pH, finalTurb*0.5, dhw).toFixed(1)) },
    { scenario: "pH +0.2",        bleaching: parseFloat(calc(finalTemp,   pH+0.2, finalTurb, dhw).toFixed(1)) },
  ];
  const bestScenario = interventionData.slice(1).reduce((a, b) => a.bleaching < b.bleaching ? a : b);
  const prioritySites: { site: string; avgBleaching: number; avgDHW: number; riskScore: number; urgency: string }[] = p5.prioritySites ?? [];
  const simulationData: { temp: number; baseline: number; highTemp: number; lowTurb: number }[] = p5.simulationData ?? [];

  const TOOLTIP_STYLE = TT;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Decision Support & Simulation" subtitle="MLR · Scenario Analysis" isDark={isDark} />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* KPI row */}
        <div className="rounded-2xl p-5" style={card}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Model Overview</h2>
              <p className="text-xs mt-0.5" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Key system metrics and status</p>
            </div>
            <span className="text-xs text-teal-500 font-medium">Multiple Linear Regression</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "🌡️", label: "Current Temp", value: `${finalTemp}°C`, sub: "↑1°C vs baseline", subColor: "text-orange-500", bg: "bg-orange-50" },
              { icon: "💧", label: "Turbidity",     value: `${finalTurb.toFixed(2)} NTU`, sub: "Moderate",    subColor: "text-yellow-600", bg: "bg-blue-50"   },
              { icon: "⚗️", label: "pH Level",      value: `${pH.toFixed(2)}`,            sub: "Stable",      subColor: "text-green-600",  bg: "bg-purple-50" },
              { icon: "🔥", label: "DHW Stress",    value: `${dhw}`,                      sub: "Moderate",    subColor: "text-orange-500", bg: "bg-red-50"    },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: isDark ? "#0d1729" : "#f8fafc", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center shrink-0 text-xl`}>{c.icon}</div>
                <div>
                  <div className="text-[17px] font-bold leading-tight" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{c.value}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: isDark ? "#4a6080" : "#64748b" }}>{c.label}</div>
                  <div className={`text-[11px] font-semibold mt-0.5 ${c.subColor}`}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sliders + Prediction */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sliders */}
          <div className="rounded-2xl p-5 flex flex-col" style={card}>
            <h2 className="text-sm font-semibold mb-0.5" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Scenario Simulation</h2>
            <p className="text-xs mb-5" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Adjust parameters and run simulations</p>
            <div className="space-y-4 flex-1">
              {[
                { label: "Temperature Increase", val: `${tempDelta>0?"+":""}${tempDelta}°C`, range: { min:-2, max:5, step:0.5, value:tempDelta, onChange:(v:number)=>setTempDelta(v) }, hint:"-2°C – +5°C", color:"#0d9488" },
                { label: "Turbidity Reduction",  val: `${turbReduction}%`,                  range: { min:0,  max:100, step:5, value:turbReduction, onChange:(v:number)=>setTurbReduction(v) }, hint:"0% – 100%", color:"#0d9488" },
                { label: "pH Level",             val: `${pH.toFixed(2)}`,                   range: { min:6.5, max:9.0, step:0.05, value:pH, onChange:(v:number)=>setPH(v) }, hint:"6.5 – 9.0 (Target: 7.5–8.5)", color:"#7c3aed" },
                { label: "DHW Stress",           val: `${dhw}`,                             range: { min:0, max:20, step:0.5, value:dhw, onChange:(v:number)=>setDhw(v) }, hint:"0 – 20 DHW", color:"#f97316" },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs" style={{ color: isDark ? "#94a3b8" : "#475569" }}>{s.label} <span className="font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{s.val}</span></span>
                    <span className="text-[10px]" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>{s.hint}</span>
                  </div>
                  <input type="range" {...s.range} onChange={e => s.range.onChange(Number(e.target.value))} className="w-full cursor-pointer" style={{ accentColor: s.color }} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setTempDelta(0); setTurbReduction(0); setPH(8.1); setDhw(3); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: isDark ? "#0d1729" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0", color: isDark ? "#94a3b8" : "#475569" }}>
                ↺ Reset
              </button>
              <button className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 shadow-sm">
                ▶ Run Simulation
              </button>
            </div>
          </div>

          {/* Real-time prediction */}
          <div className="rounded-2xl p-5 flex flex-col" style={card}>
            <div className="flex items-start justify-between mb-0.5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Real-time Prediction</h2>
                <p className="text-xs mt-0.5" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>MLR Model Output</p>
              </div>
              <span className="text-[11px]" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Last updated: 2 min ago</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <GaugeChart value={pred} isDark={isDark} />
              <div className="text-[42px] font-bold leading-none mt-1 mb-1" style={{ color: riskColor }}>{pred.toFixed(1)}%</div>
              <p className="text-xs mb-2.5" style={{ color: isDark ? "#4a6080" : "#64748b" }}>Predicted Bleaching</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${riskBadge}`}>
                ⚠ Risk Category: {riskLabel}
              </span>
            </div>
            <div className="rounded-xl p-3 text-[11px] font-mono space-y-0.5" style={{ background: isDark ? "#0d1729" : "#f8fafc", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9", color: isDark ? "#4a6080" : "#64748b" }}>
              <p className="font-sans font-semibold text-xs mb-1" style={{ color: isDark ? "#94a3b8" : "#334155" }}>MLR Equation</p>
              <p>y = {weights[0]?.toFixed(3)}·T + {weights[1]?.toFixed(3)}·pH + {weights[2]?.toFixed(3)}·Turb + {weights[3]?.toFixed(3)}·DHW + {bias?.toFixed(3)}</p>
              <p className="text-teal-500">= {weights[0]?.toFixed(3)}×{finalTemp} + {weights[1]?.toFixed(3)}×{pH} + {weights[2]?.toFixed(3)}×{finalTurb.toFixed(2)} + {weights[3]?.toFixed(3)}×{dhw} + {bias?.toFixed(3)}</p>
              <p className="text-orange-400 font-bold">= {pred.toFixed(2)}%</p>
            </div>
            <div className={`mt-3 px-3 py-2.5 rounded-xl border text-xs flex items-start gap-2 ${riskAlert}`}>
              <span className="shrink-0 mt-0.5">⚠</span>
              <div>
                <span className="font-bold">Recommended Action: </span>
                {pred > 50 ? "IMMEDIATE intervention required. Deploy emergency cooling, restrict human activity."
                  : pred > 25 ? "Elevated risk. Increase monitoring frequency. Prepare intervention teams."
                  : "Stable conditions. Maintain routine monitoring protocol."}
              </div>
            </div>
          </div>
        </div>

        {/* Intervention + Temperature scenario */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={card}>
            <h2 className="text-sm font-semibold mb-0.5" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Intervention Impact</h2>
            <p className="text-xs mb-4" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Predicted bleaching under different intervention scenarios</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={interventionData} margin={{ top:22, right:10, left:-10, bottom:28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="scenario" tick={TICK} angle={-15} textAnchor="end" tickLine={false} axisLine={false} />
                <YAxis domain={[0,100]} tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }} />
                <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 4" label={{ value:"Danger Threshold (30%)", fill:"#ef4444", fontSize:10, position:"insideTopRight" }} />
                <Bar dataKey="bleaching" fill="#0d9488" radius={[5,5,0,0]}>
                  <LabelList dataKey="bleaching" position="top" style={{ fill: isDark ? "#94a3b8" : "#475569", fontSize:10, fontWeight:700 }} formatter={(v: number|string)=>`${Number(v).toFixed(1)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs mt-1" style={{ color: isDark ? "#4a6080" : "#64748b" }}>ℹ {bestScenario.scenario} shows the most significant improvement.</p>
          </div>

          <div className="rounded-2xl p-5" style={card}>
            <h2 className="text-sm font-semibold mb-0.5" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Temperature Scenario Simulation</h2>
            <p className="text-xs mb-4" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>MLR-predicted bleaching across temperature scenarios</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={simulationData} margin={{ top:5, right:10, left:-10, bottom:25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="temp" tick={TICK} tickLine={false} axisLine={false} label={{ value:"Temperature (°C)", position:"insideBottom", offset:-12, fill: TICK.fill, fontSize:10 }} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} label={{ value:"Predicted Bleaching %", angle:-90, position:"insideLeft", fill: TICK.fill, fontSize:9 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11, color: isDark ? "#64748b" : "#64748b", paddingTop:"6px" }} />
                <Line type="monotone" dataKey="highTemp" stroke="#ef4444" strokeWidth={2} dot={false} name="+1°C Warming" strokeDasharray="5 3" />
                <Line type="monotone" dataKey="baseline" stroke="#0d9488" strokeWidth={2} dot={false} name="Baseline" />
                <Line type="monotone" dataKey="lowTurb"  stroke="#22c55e" strokeWidth={2} dot={false} name="−50% Turbidity" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority table */}
        {prioritySites.length > 0 && (
          <div className="rounded-2xl p-5" style={card}>
            <h2 className="text-sm font-semibold mb-0.5" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Priority Site Rankings</h2>
            <p className="text-xs mb-4" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Risk Score = 0.35·Bleaching + 0.30·DHW + 0.25·|SSTA|. Higher = more urgent.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: isDark ? "#4a6080" : "#94a3b8", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9" }}>
                    {["Rank","Site","Risk Score","Avg Bleaching","Avg DHW","Urgency"].map(h => (
                      <th key={h} className={`py-2 pr-4 font-medium ${h==="Rank"||h==="Site"?"text-left":"text-right"} ${h==="Urgency"?"text-left":""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prioritySites.map((s, i) => (
                    <tr key={s.site} style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid #f8fafc" }}>
                      <td className="py-2.5 pr-4" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>#{i+1}</td>
                      <td className="py-2.5 pr-4 font-semibold" style={{ color: isDark ? "#f1f5f9" : "#334155" }}>{s.site}</td>
                      <td className="py-2.5 pr-4 text-right text-amber-500 font-bold">{s.riskScore}</td>
                      <td className="py-2.5 pr-4 text-right text-teal-500">{s.avgBleaching}%</td>
                      <td className="py-2.5 pr-4 text-right text-orange-500">{s.avgDHW}</td>
                      <td className="py-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          s.urgency==="Critical"?"bg-red-50 text-red-700":s.urgency==="High"?"bg-orange-50 text-orange-700":"bg-yellow-50 text-yellow-700"
                        }`}>{s.urgency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
