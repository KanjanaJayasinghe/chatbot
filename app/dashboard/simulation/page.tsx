// ─────────────────────────────────────────────────────────────────────────────
// PAGE 5 – Decision Support & Simulation
//
// AI MODELS USED IN THIS PAGE:
//
//  1. Multiple Linear Regression  (lib/models/linearRegression.ts)
//     ├─ Live Prediction Panel (slider widget)
//     │    Features : Temperature_Celsius, pH, Turbidity_NTU, DHW_Stress
//     │    Formula  : ŷ = w₀·Temp + w₁·pH + w₂·Turbidity + w₃·DHW + bias
//     │    Training : Gradient descent on full dataset in /api/dashboard
//     │    Real-time: slider inputs recalculate ŷ in the browser instantly
//     │
//     ├─ Chart: Intervention Impact Bar Chart
//     │    Uses the same MLR formula to compare 5 what-if scenarios:
//     │    Baseline, +1°C, +2°C warming, −50% turbidity, pH +0.2
//     │
//     └─ Chart: Temperature Scenario Line Chart
//          Sweeps Temperature from the API's simulationData grid
//          while holding all other features constant at their mean values.
//
//  2. Priority Ranking (scoring, no ML model)
//     └─ Table: Priority Site Rankings
//          riskScore = 0.5·avgBleaching_norm + 0.3·avgDHW_norm + 0.2·variance_norm
//          Ranks sites for conservation resource allocation.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useDashboardData } from "../useDashboardData";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
} from "recharts";

function ModelBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-amber-950 border border-amber-800 text-amber-300 text-xs px-3 py-1.5 rounded-full">
      <span className="font-bold">🤖 {name}</span>
      <span className="text-amber-500">·</span>
      <span className="text-amber-400">{desc}</span>
    </div>
  );
}

const URGENCY_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/30 border-red-700",
  High: "text-orange-400 bg-orange-900/30 border-orange-700",
  Medium: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
};

export default function SimulationPage() {
  const { data, loading, error } = useDashboardData();

  // Simulation sliders
  const [tempDelta, setTempDelta] = useState(0);
  const [turbReduction, setTurbReduction] = useState(0);
  const [pH, setPH] = useState(8.1);
  const [dhw, setDhw] = useState(3);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400"><div className="text-center"><div className="text-4xl mb-3 animate-pulse">🧠</div><div>Loading prediction model…</div></div></div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const p5 = data.page5;
  if (!p5?.models?.multipleLinearRegression) {
    return <div className="p-8 text-yellow-400">⚠ Simulation model data not available. Check the API route or reload.</div>;
  }
  const mlrModel = p5.models.multipleLinearRegression;
  const weights: number[] = p5.mlrCoefficients ?? [];
  const bias: number = p5.mlrBias ?? 0;

  // Real-time prediction using Multiple Linear Regression
  // Features: Temperature_Celsius, pH, Turbidity_NTU, DHW_Stress
  const baseTemp = 29;
  const finalTemp = baseTemp + tempDelta;
  const finalTurb = Math.max(0, 2.5 * (1 - turbReduction / 100));

  let predictedBleaching = 20; // fallback
  if (weights.length >= 4) {
    predictedBleaching = weights[0] * finalTemp + weights[1] * pH + weights[2] * finalTurb + weights[3] * dhw + bias;
    predictedBleaching = Math.max(0, Math.min(100, predictedBleaching));
  }

  const riskCategory =
    predictedBleaching > 50 ? "Critical" : predictedBleaching > 25 ? "High" : predictedBleaching > 10 ? "Moderate" : "Low";
  const riskColor = predictedBleaching > 50 ? "#ef4444" : predictedBleaching > 25 ? "#f97316" : predictedBleaching > 10 ? "#eab308" : "#22c55e";

  // Intervention impact: baseline vs scenario
  const interventionData = [
    { scenario: "Baseline", bleaching: predictedBleaching.toFixed(1) },
    { scenario: "+1°C Warming", bleaching: Math.max(0, weights.length >= 4 ? weights[0] * (finalTemp + 1) + weights[1] * pH + weights[2] * finalTurb + weights[3] * dhw + bias : predictedBleaching + 5).toFixed(1) },
    { scenario: "+2°C Warming", bleaching: Math.max(0, weights.length >= 4 ? weights[0] * (finalTemp + 2) + weights[1] * pH + weights[2] * finalTurb + weights[3] * dhw + bias : predictedBleaching + 10).toFixed(1) },
    { scenario: "−50% Turbidity", bleaching: Math.max(0, weights.length >= 4 ? weights[0] * finalTemp + weights[1] * pH + weights[2] * (finalTurb * 0.5) + weights[3] * dhw + bias : predictedBleaching - 3).toFixed(1) },
    { scenario: "pH +0.2", bleaching: Math.max(0, weights.length >= 4 ? weights[0] * finalTemp + weights[1] * (pH + 0.2) + weights[2] * finalTurb + weights[3] * dhw + bias : predictedBleaching - 2).toFixed(1) },
  ].map((d) => ({ ...d, bleaching: parseFloat(d.bleaching as string) }));

  const prioritySites: { site: string; avgBleaching: number; avgDHW: number; riskScore: number; urgency: string }[] = p5.prioritySites ?? [];
  const simulationData: { temp: number; baseline: number; highTemp: number; lowTurb: number }[] = p5.simulationData ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🧠 Decision Support & Simulation</h1>
        <p className="text-gray-400 text-sm mt-1">What action should we take? AI-powered prediction, simulation, and priority ranking.</p>
      </div>

      {/* Model explainer */}
      <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4">
        <ModelBadge name={mlrModel.name} desc="Real-time Prediction + What-if Simulation" />
        <p className="text-xs text-amber-300 mt-2 leading-relaxed">{mlrModel.description}</p>
        <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
          {(mlrModel.features as string[]).map((f: string, i: number) => (
            <div key={f} className="bg-amber-900/30 rounded-lg p-2">
              <div className="text-amber-400 font-bold">x{i + 1}</div>
              <div className="text-gray-400">{f.replace(/_/g, " ")}</div>
              {weights[i] !== undefined && (
                <div className="text-amber-300 mt-1">w = {weights[i]?.toFixed(4)}</div>
              )}
            </div>
          ))}
        </div>
        {bias !== 0 && (
          <div className="text-xs text-gray-500 mt-2">Bias (intercept): {bias.toFixed(4)}</div>
        )}
      </div>

      {/* Prediction Panel + Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">🎛️ Scenario Simulation – Adjust Parameters</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Temperature Increase: <span className="text-white font-bold">{tempDelta > 0 ? "+" : ""}{tempDelta}°C</span></span>
                <span>Base: 29°C → Final: {finalTemp}°C</span>
              </div>
              <input type="range" min={-2} max={4} step={0.5} value={tempDelta} onChange={(e) => setTempDelta(Number(e.target.value))}
                className="w-full accent-orange-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Turbidity Reduction: <span className="text-white font-bold">{turbReduction}%</span></span>
                <span>Turbidity: {finalTurb.toFixed(2)} NTU</span>
              </div>
              <input type="range" min={0} max={90} step={5} value={turbReduction} onChange={(e) => setTurbReduction(Number(e.target.value))}
                className="w-full accent-cyan-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>pH Level: <span className="text-white font-bold">{pH.toFixed(2)}</span></span>
                <span>Acidification control</span>
              </div>
              <input type="range" min={7.5} max={8.5} step={0.05} value={pH} onChange={(e) => setPH(Number(e.target.value))}
                className="w-full accent-blue-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>DHW Stress: <span className="text-white font-bold">{dhw}</span></span>
                <span>Degree Heating Weeks</span>
              </div>
              <input type="range" min={0} max={20} step={0.5} value={dhw} onChange={(e) => setDhw(Number(e.target.value))}
                className="w-full accent-yellow-500" />
            </div>
          </div>
        </div>

        {/* Real-time prediction output */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <h2 className="font-semibold text-white mb-4">🧠 Real-time Prediction (MLR)</h2>
          <div className="text-center">
            <div className="text-6xl font-bold mb-2" style={{ color: riskColor }}>
              {predictedBleaching.toFixed(1)}%
            </div>
            <div className="text-gray-400 text-sm mb-4">Predicted Bleaching</div>
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold border" style={{ color: riskColor, borderColor: riskColor, background: `${riskColor}22` }}>
              Risk Category: {riskCategory}
            </div>
          </div>

          {/* Formula display */}
          <div className="mt-4 bg-gray-800 rounded-lg p-3 text-xs text-gray-400 font-mono">
            <div className="text-gray-300 mb-1">MLR Equation:</div>
            <div>ŷ = {weights[0]?.toFixed(3) ?? "w₁"}·T + {weights[1]?.toFixed(3) ?? "w₂"}·pH + {weights[2]?.toFixed(3) ?? "w₃"}·Turb + {weights[3]?.toFixed(3) ?? "w₄"}·DHW + {bias?.toFixed(3) ?? "b"}</div>
            <div className="text-cyan-400 mt-1">= {weights[0]?.toFixed(3)}×{finalTemp} + {weights[1]?.toFixed(3)}×{pH} + {weights[2]?.toFixed(3)}×{finalTurb.toFixed(2)} + {weights[3]?.toFixed(3)}×{dhw} + {bias?.toFixed(3)}</div>
            <div className="text-amber-400">= {predictedBleaching.toFixed(2)}%</div>
          </div>

          {/* Recommended action */}
          <div className={`mt-3 p-3 rounded-lg border text-xs ${predictedBleaching > 50 ? "bg-red-950 border-red-800 text-red-300" : predictedBleaching > 25 ? "bg-orange-950 border-orange-800 text-orange-300" : "bg-green-950 border-green-800 text-green-300"}`}>
            <span className="font-bold">✅ Recommended Action: </span>
            {predictedBleaching > 50
              ? "IMMEDIATE intervention required. Deploy emergency cooling, restrict human activity."
              : predictedBleaching > 25
              ? "Elevated risk. Increase monitoring frequency. Prepare intervention teams."
              : "Stable conditions. Maintain routine monitoring protocol."}
          </div>
        </div>
      </div>

      {/* Intervention Impact + Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intervention impact bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">📊 Intervention Impact Chart</h2>
          <p className="text-xs text-gray-500 mb-3">Predicted bleaching under different intervention scenarios using current slider settings.</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={interventionData} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="scenario" tick={{ fill: "#9ca3af", fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Danger threshold", fill: "#ef4444", fontSize: 10 }} />
              <Bar dataKey="bleaching" name="Predicted Bleaching %">
                {interventionData.map((entry, i) => (
                  <rect key={i} fill={entry.bleaching > 50 ? "#ef4444" : entry.bleaching > 25 ? "#f97316" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature scenario simulation */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">🎛️ Temperature Scenario Simulation</h2>
          <p className="text-xs text-gray-500 mb-3">MLR-predicted bleaching across temperatures for three scenarios: baseline, +1°C warming, and −50% turbidity reduction.</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="temp" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Temperature (°C)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Predicted Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="baseline" stroke="#22d3ee" strokeWidth={2} dot={false} name="Baseline" />
              <Line type="monotone" dataKey="highTemp" stroke="#ef4444" strokeWidth={2} dot={false} name="+1°C Warming" strokeDasharray="5 3" />
              <Line type="monotone" dataKey="lowTurb" stroke="#22c55e" strokeWidth={2} dot={false} name="−50% Turbidity" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Ranking Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold text-white mb-1">🏆 Priority Ranking Table (AI Risk Score)</h2>
        <p className="text-xs text-gray-500 mb-3">
          Sites ranked by composite Risk Score = 0.35·Bleaching + 0.30·DHW + 0.25·|SSTA|. Higher score = more urgent intervention.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 pr-4">Rank</th>
                <th className="text-left py-2 pr-4">Site</th>
                <th className="text-right py-2 pr-4">Risk Score</th>
                <th className="text-right py-2 pr-4">Avg Bleaching</th>
                <th className="text-right py-2 pr-4">Avg DHW</th>
                <th className="text-left py-2">Urgency</th>
              </tr>
            </thead>
            <tbody>
              {prioritySites.map((site, i) => (
                <tr key={site.site} className="border-b border-gray-800 hover:bg-gray-800/40">
                  <td className="py-2 pr-4 text-gray-400">#{i + 1}</td>
                  <td className="py-2 pr-4 text-white font-medium">{site.site}</td>
                  <td className="py-2 pr-4 text-right text-amber-300 font-bold">{site.riskScore}</td>
                  <td className="py-2 pr-4 text-right text-cyan-300">{site.avgBleaching}%</td>
                  <td className="py-2 pr-4 text-right text-orange-300">{site.avgDHW}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded border text-xs font-bold ${URGENCY_COLORS[site.urgency] ?? "text-gray-400"}`}>
                      {site.urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
