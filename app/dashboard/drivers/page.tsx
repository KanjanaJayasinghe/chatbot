"use client";
import { useDashboardData } from "../useDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from "recharts";

function heatColor(value: number, min: number, max: number): string {
  const t = max > min ? (value - min) / (max - min) : 0;
  const r = Math.round(59 + t * (239 - 59));
  const g = Math.round(130 - t * 80);
  const b = Math.round(246 - t * 210);
  return `rgb(${r},${g},${b})`;
}

function formatFeatureLabel(raw: string): string {
  const key = raw.toLowerCase();
  if (key.includes("dhw")) return "Heat Stress (DHW)";
  if (key.includes("ssta")) return "Unusually Warm Water";
  if (key.includes("temp")) return "Sea Temperature";
  if (key.includes("turb")) return "Water Turbidity";
  if (key === "ph" || key.includes("ph")) return "Water pH";
  if (key.includes("chlorophyll")) return "Chlorophyll";
  if (key.includes("depth")) return "Depth";
  return raw.replaceAll("_", " ");
}

export default function DriversPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#060d1f" : "#f8fafc", color: isDark ? "#94a3b8" : "#64748b" }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌡️</div>
          <div>Loading bleaching driver insights...</div>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p4 = data.page4;
  if (!p4?.models?.randomForest) {
    return <div className="p-8 text-yellow-600">⚠ Driver analysis data not available. Check the API route or reload.</div>;
  }

  const featureImportances = ((p4.featureImportances ?? []) as { feature: string; importance: number }[]).map((item) => ({
    ...item,
    label: formatFeatureLabel(item.feature),
  }));

  const shapData = (p4.shapData ?? []) as {
    feature: string;
    sampleValues: number[];
    shapContribs: number[];
  }[];

  const pdp = (p4.pdpTemperature ?? []) as { x: number; y: number }[];
  const interactionHeatmap = (p4.interactionHeatmap ?? []) as { x: string; y: string; value: number }[];
  const ensoBoxPlot = (p4.ensoBoxPlot ?? []) as {
    phase: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
  }[];

  const shapScatter = shapData.flatMap((f) =>
    f.sampleValues.map((v, i) => ({
      feature: formatFeatureLabel(f.feature),
      sampleVal: v,
      shap: f.shapContribs[i],
    }))
  );
  const shapIncrease = shapScatter.filter((p) => p.shap > 0);
  const shapDecrease = shapScatter.filter((p) => p.shap <= 0);

  const xLabels = [...new Set(interactionHeatmap.map((d) => d.x))];
  const yLabels = [...new Set(interactionHeatmap.map((d) => d.y))];
  const interactionValues = interactionHeatmap.map((d) => d.value);
  const interactionMin = interactionValues.length ? Math.min(...interactionValues) : 0;
  const interactionMax = interactionValues.length ? Math.max(...interactionValues) : 1;

  const topDriver = featureImportances[0]?.label ?? "Not enough data";

  return (
    <div className="p-6 space-y-6">
      <div className="-mx-6 -mt-6 px-6 py-4 mb-2" style={{ background: isDark ? "#040d1a" : "#ffffff", borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌡️ What Is Driving Bleaching?</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Clear explanations of which ocean conditions are most linked to reef bleaching.</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4", border: isDark ? "1px solid rgba(34,197,94,0.15)" : "1px solid #bbf7d0" }}>
        <h2 className="text-sm font-semibold" style={{ color: isDark ? "#86efac" : "#15803d" }}>How to Read This Page</h2>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: isDark ? "#86efac" : "#15803d" }}>
          Use these charts to identify the strongest bleaching drivers, spot risky condition combinations, and guide where teams should act first.
        </p>
        <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
          {[
            { label: "Top Driver", val: topDriver },
            { label: "Risk Direction", val: "See which factors push bleaching up or down" },
            { label: "Heat Threshold", val: "Check where temperature impact rises quickly" },
            { label: "Field Use", val: "Prioritize patrols and mitigation at highest-risk sites" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2" style={{ background: isDark ? "#0d1729" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
              <div className="font-bold" style={{ color: isDark ? "#86efac" : "#15803d" }}>{s.label}</div>
              <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📊 Which Factors Matter Most?</h2>
          <p className="text-xs mb-1" style={{ color: "#64748b" }}>
            Higher bars mean a stronger link with bleaching in this dataset.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={featureImportances} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" tick={TICK} label={{ value: "Relative influence (%)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
              <YAxis type="category" dataKey="label" tick={{ fill: TICK.fill, fontSize: 10 }} width={140} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🧭 How Each Factor Pushes Risk Up or Down</h2>
          <p className="text-xs mb-1" style={{ color: "#64748b" }}>
            Red points raise predicted bleaching risk. Blue points lower predicted risk.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="shap" name="Risk Effect" tick={{ fill: TICK.fill, fontSize: 10 }} label={{ value: "Push on bleaching prediction", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
              <YAxis dataKey="feature" name="Feature" type="category" tick={{ fill: TICK.fill, fontSize: 9 }} width={140} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="p-2 rounded text-xs shadow-md" style={TT}>
                      <div className="font-bold">{d.feature}</div>
                      <div>Observed value: {d.sampleVal?.toFixed(2)}</div>
                      <div>Effect: {d.shap?.toFixed(3)} ({d.shap > 0 ? "Raises risk" : "Lowers risk"})</div>
                    </div>
                  );
                }}
              />
              <Scatter data={shapIncrease} opacity={0.75} fill="rgba(239,68,68,0.7)" name="Raises risk" />
              <Scatter data={shapDecrease} opacity={0.75} fill="rgba(59,130,246,0.7)" name="Lowers risk" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📈 How Temperature Changes Bleaching Risk</h2>
          <p className="text-xs mb-1" style={{ color: "#64748b" }}>
            This curve shows how expected bleaching changes as temperature rises.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={pdp}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="x" tick={TICK} label={{ value: "Temperature (C)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
              <YAxis tick={TICK} label={{ value: "Expected Bleaching %", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }} />
              <Tooltip
                contentStyle={TT}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Expected bleaching"]}
              />
              <Line type="monotone" dataKey="y" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316" }} name="Expected bleaching risk" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🔗 Combined Effect: Temperature and pH</h2>
          <p className="text-xs mb-1" style={{ color: "#64748b" }}>
            Each cell shows expected bleaching under that temperature and pH combination.
          </p>
          {interactionHeatmap.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-2" style={{ color: isDark ? "#4a6080" : "#64748b" }}>pH \ Temp</th>
                    {xLabels.map((x) => (
                      <th key={x} className="px-2 py-1 text-center" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yLabels.map((y) => (
                    <tr key={y}>
                      <td className="pr-2 py-1" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>{y}</td>
                      {xLabels.map((x) => {
                        const cell = interactionHeatmap.find((d) => d.x === x && d.y === y);
                        const cellBackground = cell
                          ? heatColor(cell.value, interactionMin, interactionMax)
                          : (isDark ? "#0d1729" : "#f8fafc");
                        return (
                          <td
                            key={x}
                            className="px-1 py-1 text-center rounded"
                            style={{
                              background: cellBackground,
                              color: isDark ? "#f1f5f9" : "#1e293b",
                            }}
                          >
                            {cell?.value?.toFixed(1) ?? "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-center py-8" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Not enough data to show this map yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📦 Bleaching Levels by ENSO Climate Phase</h2>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>
          Compare bleaching spread during El Nino, La Nina, and Neutral conditions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ensoBoxPlot.map((phase) => (
            <div key={phase.phase} className="rounded-lg p-3" style={{ background: isDark ? "#0d1729" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
              <div className="font-semibold mb-2" style={{ color: isDark ? "#5eead4" : "#0f766e" }}>{phase.phase}</div>
              {[
                { label: "Highest", val: phase.max, color: "text-red-500" },
                { label: "Upper 25%", val: phase.q3, color: "text-orange-500" },
                { label: "Middle", val: phase.median, color: "text-yellow-600" },
                { label: "Average", val: phase.mean, color: isDark ? "text-slate-300" : "text-slate-700" },
                { label: "Lower 25%", val: phase.q1, color: "text-blue-500" },
                { label: "Lowest", val: phase.min, color: "text-green-500" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-xs py-0.5" style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                  <span style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>{s.label}</span>
                  <span className={s.color}>{s.val?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: isDark ? "rgba(16,185,129,0.06)" : "#ecfdf5", border: isDark ? "1px solid rgba(16,185,129,0.15)" : "1px solid #a7f3d0" }}>
        <h3 className="font-semibold mb-2" style={{ color: isDark ? "#6ee7b7" : "#065f46" }}>🧭 What This Means for Coastal Teams</h3>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: isDark ? "#34d399" : "#047857" }}>
          <li>Start weekly checks on sites affected by the strongest driver shown in the ranking chart.</li>
          <li>Use red risk-push factors to trigger early warnings before severe bleaching appears.</li>
          <li>If temperature risk climbs sharply, prepare seasonal mitigation actions earlier.</li>
          <li>Prioritize places where high temperature and low pH occur together, as these combinations can be more damaging.</li>
        </ul>
      </div>
    </div>
  );
}