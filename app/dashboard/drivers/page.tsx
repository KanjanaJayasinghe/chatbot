// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4 – Environmental Drivers (Explainable AI)
//
// AI MODELS USED IN THIS PAGE:
//
//  1. Random Forest Regressor  (lib/models/randomForest.ts)
//     ├─ Chart: Feature Importance Bar Chart
//     │    Method : MDI (Mean Decrease Impurity)
//     │    Formula: importance_j = Σ_trees Σ_splits_on_j (n_node/N) × ΔVariance
//     │    Normalised to sum to 1 across all features.
//     │
//     ├─ Chart: SHAP Summary Scatter Plot
//     │    Method : Path-based TreeSHAP approximation
//     │    Formula: φ_j(x) = mean over trees of Σ_{splits on j in path} (child_mean − parent_mean)
//     │    Red = feature pushes bleaching prediction UP; Blue = pushes DOWN.
//     │
//     ├─ Chart: Partial Dependence Plot (PDP) – Temperature
//     │    Method : Marginalise RF predictions over all other features
//     │    Formula: PDP(x_j) = (1/n) Σ_i f(x_j, X_{-j}^{(i)})
//     │    Reveals nonlinear Temperature → Bleaching relationship.
//     │
//     └─ Chart: Interaction Heatmap – Temperature × pH
//          Method : RF prediction grid with two features jointly varied
//          Shows combined (synergistic) effect of Temperature and pH on bleaching.
//
//  2. Descriptive Statistics (no ML model)
//     └─ Chart: ENSO Box Plot
//          Computes Q1 / Median / Q3 / IQR per ENSO phase group.
//          Used to compare bleaching distributions across El Niño / La Niña / Neutral.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useDashboardData } from "../useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Cell,
} from "recharts";

// ── ModelBadge: visible label shown on the UI for each AI model used ─────────
function ModelBadge({ name, desc, isDark }: { name: string; desc: string; isDark?: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
      style={{ background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4", border: isDark ? "1px solid rgba(34,197,94,0.2)" : "1px solid #bbf7d0", color: isDark ? "#86efac" : "#15803d" }}
    >
      <span className="font-bold">🤖 {name}</span>
      <span>·</span>
      <span>{desc}</span>
    </div>
  );
}

// ── SectionModelTag: inline tag inside each chart section ────────────────────
function SectionModelTag({ model, method, isDark }: { model: string; method: string; isDark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ml-2"
      style={{ background: isDark ? "rgba(20,184,166,0.1)" : "#f0fdfa", border: isDark ? "1px solid rgba(20,184,166,0.2)" : "1px solid #99f6e4", color: isDark ? "#5eead4" : "#0f766e" }}
    >
      MODEL: {model} · {method}
    </span>
  );
}

// ── heatColor: maps a value to a red-blue color scale for the interaction heatmap
// Used by: Random Forest interaction grid (Temperature × pH)
function heatColor(value: number, min: number, max: number): string {
  const t = max > min ? (value - min) / (max - min) : 0;
  const r = Math.round(59 + t * (239 - 59));
  const g = Math.round(130 - t * 80);
  const b = Math.round(246 - t * 210);
  return `rgb(${r},${g},${b})`;
}

export default function DriversPage() {
  const { data, loading, error, isDark } = useDashboardData();
  const GRID = isDark ? "#1a2540" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const TT = isDark ? { background: "#0d1729", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 } : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#334155", fontSize: 12 };
  const card = { background: isDark ? "#0f1829" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0", boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.05)" };

  if (loading) return <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#060d1f" : "#f8fafc", color: isDark ? "#94a3b8" : "#64748b" }}><div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌡️</div><div>Running Random Forest + SHAP…</div></div></div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p4 = data.page4;
  if (!p4?.models?.randomForest) {
    return <div className="p-8 text-yellow-600">⚠ Driver analysis data not available. Check the API route or reload.</div>;
  }
  // rfModel metadata is returned by the API from RandomForestRegressor in lib/models/randomForest.ts
  const rfModel = p4.models.randomForest;

  // ── DATA SOURCED FROM AI MODELS ──────────────────────────────────────────
  // featureImportances → RandomForestRegressor.featureImportances (MDI, lib/models/randomForest.ts)
  const featureImportances: { feature: string; importance: number }[] = p4.featureImportances ?? [];
  // shapData → RandomForestRegressor.shapValues() (TreeSHAP path attribution, lib/models/randomForest.ts)
  const shapData: { feature: string; sampleValues: number[]; shapContribs: number[] }[] = p4.shapData ?? [];
  // pdp → RF.predict() averaged over marginalised feature grid (lib/models/randomForest.ts)
  const pdp: { x: number; y: number }[] = p4.pdpTemperature ?? [];
  // interactionHeatmap → RF.predict() over joint Temperature × pH grid (lib/models/randomForest.ts)
  const interactionHeatmap: { x: string; y: string; value: number }[] = p4.interactionHeatmap ?? [];
  // ensoBoxPlot → Descriptive statistics grouped by ENSO phase (no ML model)
  const ensoBoxPlot: { phase: string; min: number; q1: number; median: number; q3: number; max: number; mean: number }[] = p4.ensoBoxPlot ?? [];

  // ── SHAP scatter: flatten [feature × sample] matrix for scatter chart ───
  // Each point = one sample's (feature, SHAP value) pair from RandomForestRegressor.shapValues()
  const shapScatter = shapData.flatMap((f) =>
    f.sampleValues.map((v, i) => ({ feature: f.feature, sampleVal: v, shap: f.shapContribs[i] }))
  );

  // ── Interaction heatmap axes (from RF prediction grid) ───────────────────
  const xLabels = [...new Set(interactionHeatmap.map((d) => d.x))];
  const yLabels = [...new Set(interactionHeatmap.map((d) => d.y))];
  const interactionMin = Math.min(...interactionHeatmap.map((d) => d.value));
  const interactionMax = Math.max(...interactionHeatmap.map((d) => d.value));

  return (
    <div className="p-6 space-y-6">
      <div className="-mx-6 -mt-6 px-6 py-4 mb-2" style={{ background: isDark ? "#040d1a" : "#ffffff", borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌡️ Environmental Drivers – Explainable AI</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Why is bleaching happening? Feature importance and AI explainability.</p>
      </div>

      {/* ── AI MODEL OVERVIEW CARD ─────────────────────────────────────────
          Model: Random Forest Regressor (lib/models/randomForest.ts)
          This card summarises the model architecture used for all charts on this page.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4", border: isDark ? "1px solid rgba(34,197,94,0.15)" : "1px solid #bbf7d0" }}>
        <ModelBadge name={rfModel.name} desc="Feature Importance + SHAP + PDP + Interaction" isDark={isDark} />
        <p className="text-xs mt-2 leading-relaxed" style={{ color: isDark ? "#86efac" : "#15803d" }}>{rfModel.description}</p>
        <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
          {[
            { label: "Bootstrap Sampling", val: "80% random row sample per tree" },
            { label: "Random Subspace", val: "√d features considered per split" },
            { label: "Split Criterion", val: "Minimise within-child variance (MSE)" },
            { label: "Ensemble", val: `${rfModel.nEstimators} trees, max depth ${rfModel.maxDepth}` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2" style={{ background: isDark ? "#0d1729" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
              <div className="font-bold" style={{ color: isDark ? "#86efac" : "#15803d" }}>{s.label}</div>
              <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHART 1 + CHART 2 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── CHART 1: Feature Importance Bar Chart ───────────────────────────
            AI MODEL  : Random Forest Regressor (lib/models/randomForest.ts)
            TECHNIQUE : MDI – Mean Decrease Impurity
            FORMULA   : importance_j = Σ_trees Σ_{splits on j} (n_node / N) × ΔVariance
                        Normalised so all importances sum to 1.
            OUTPUT    : rfModel.featureImportances[] → mapped to percentage display
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            📊 Feature Importance (MDI)
            <SectionModelTag model="Random Forest" method="Mean Decrease Impurity" isDark={isDark} />
          </h2>
          <p className="text-xs mb-1" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            <span className="font-mono" style={{ color: isDark ? "#5eead4" : "#0f766e" }}>RandomForestRegressor.featureImportances</span> —
            importance_j = Σ (n_node/N) × ΔVariance, averaged across all {rfModel.nEstimators} trees.
            Higher = stronger driver of bleaching.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={featureImportances} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" tick={TICK} label={{ value: "Importance (%)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
              <YAxis type="category" dataKey="feature" tick={{ fill: TICK.fill, fontSize: 10 }} width={120} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {featureImportances.map((_, i) => (
                  <Cell key={_.feature} fill={`hsl(${160 - i * 15}, 70%, ${55 - i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── CHART 2: SHAP Summary Scatter Plot ──────────────────────────────
            AI MODEL  : Random Forest Regressor (lib/models/randomForest.ts)
            TECHNIQUE : TreeSHAP – path-based attribution approximation
            FORMULA   : φ_j(x) = (1/T) Σ_trees Σ_{splits on j in path(x)} (child_mean − parent_mean)
            COLOURS   : Red  → SHAP > 0 (feature raises bleaching prediction)
                        Blue → SHAP < 0 (feature lowers bleaching prediction)
            OUTPUT    : rfModel.shapValues(X) → shapContribs[][j]
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            🧠 SHAP Summary Plot
            <SectionModelTag model="Random Forest" method="TreeSHAP Path Attribution" isDark={isDark} />
          </h2>
          <p className="text-xs mb-1" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            <span className="font-mono" style={{ color: isDark ? "#5eead4" : "#0f766e" }}>RandomForestRegressor.shapValues()</span> —
            φ_j(x) = mean over trees of Σ (child_mean − parent_mean) at each split on feature j.
            <span className="text-red-500"> Red</span> = pushes prediction UP.
            <span className="text-blue-500"> Blue</span> = pushes prediction DOWN.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="shap" name="SHAP Value" tick={{ fill: TICK.fill, fontSize: 10 }} label={{ value: "SHAP Value (φ_j)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
              <YAxis dataKey="feature" name="Feature" type="category" tick={{ fill: TICK.fill, fontSize: 9 }} width={120} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="p-2 rounded text-xs shadow-md" style={TT}>
                      <div className="font-bold">{d.feature}</div>
                      <div style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Model: Random Forest (SHAP)</div>
                      <div>Feature value: {d.sampleVal?.toFixed(2)}</div>
                      <div>φ_j(x): {d.shap?.toFixed(3)} {d.shap > 0 ? "↑ bleaching" : "↓ bleaching"}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={shapScatter} opacity={0.7}>
                {shapScatter.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.shap > 0
                      ? `rgba(239,68,68,${Math.min(1, 0.3 + Math.abs(entry.shap) * 5)})`
                      : `rgba(59,130,246,${Math.min(1, 0.3 + Math.abs(entry.shap) * 5)})`}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── CHART 3 + CHART 4 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── CHART 3: Partial Dependence Plot (PDP) ──────────────────────────
            AI MODEL  : Random Forest Regressor (lib/models/randomForest.ts)
            TECHNIQUE : Partial Dependence Plot (PDP)
            FORMULA   : PDP(x_j = t) = (1/n) Σ_i  RF.predict(x_j=t, X_{-j}^{(i)})
                        For each temperature value t, replace every sample's temperature
                        with t, run RF.predict(), then average → shows marginal effect.
            OUTPUT    : pdpTemperature[]  { x: temperature, y: avg predicted bleaching }
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: isDark ? "#0f1829" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            📈 Partial Dependence Plot – Temperature
            <SectionModelTag model="Random Forest" method="PDP Marginalisation" isDark={isDark} />
          </h2>
          <p className="text-xs mb-1" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            <span className="font-mono" style={{ color: isDark ? "#4ade80" : "#16a34a" }}>RF.predict()</span> averaged over all samples with Temperature fixed at each grid value.
            PDP(t) = (1/n) Σ f(t, x_{"{−j}"}). Reveals nonlinear Temperature → Bleaching threshold.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={pdp}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="x" tick={TICK} label={{ value: "Temperature (°C)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
              <YAxis tick={TICK} label={{ value: "Avg Predicted Bleaching %", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }} />
              <Tooltip contentStyle={TT}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "PDP (RF avg prediction)"]} />
              <Line type="monotone" dataKey="y" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316" }} name="PDP – RF Marginal Effect" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── CHART 4: Interaction Heatmap – Temperature × pH ─────────────────
            AI MODEL  : Random Forest Regressor (lib/models/randomForest.ts)
            TECHNIQUE : Joint partial dependence grid (2-variable PDP)
            FORMULA   : Grid(T, pH) = (1/n) Σ_i  RF.predict(T_fixed, pH_fixed, X_{-T,-pH}^{(i)})
                        Each cell = average RF prediction for that (Temperature, pH) pair.
            OUTPUT    : interactionHeatmap[]  { x: tempBin, y: phBin, value: avgPredicted }
            COLOUR    : Blue (low bleaching) → Red (high bleaching)
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={card}>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
            🔗 Interaction Heatmap: Temperature × pH
            <SectionModelTag model="Random Forest" method="2-Variable PDP Grid" isDark={isDark} />
          </h2>
          <p className="text-xs mb-1" style={{ color: isDark ? "#64748b" : "#64748b" }}>
            <span className="font-mono" style={{ color: isDark ? "#5eead4" : "#0f766e" }}>RF.predict()</span> on a Temperature × pH grid (other features held at mean).
            Cell = avg predicted bleaching. <span className="text-red-500">Red</span> = high bleaching risk combination.
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
                        return (
                          <td key={x} className="px-1 py-1 text-center rounded" style={{ background: cell ? heatColor(cell.value, interactionMin, interactionMax) : (isDark ? "#0d1729" : "#f8fafc"), color: isDark ? "#f1f5f9" : "#1e293b" }}>
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
            <div className="text-sm text-center py-8" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>Insufficient data for interaction heatmap</div>
          )}
        </div>
      </div>

      {/* ── CHART 5: ENSO Box Plot ───────────────────────────────────────────
          AI MODEL  : None (Descriptive Statistics)
          TECHNIQUE : Grouped box-plot statistics: Q1 / Median / Q3 / IQR per ENSO phase
          PURPOSE   : Compare bleaching distributions across El Niño / La Niña / Neutral
                      to show how large-scale climate oscillations amplify bleaching stress.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
          📦 Bleaching Distribution by ENSO Phase
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ml-2"
            style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0", color: isDark ? "#64748b" : "#64748b" }}
          >
            METHOD: Grouped Descriptive Statistics (Q1/Median/Q3/IQR)
          </span>
        </h2>
        <p className="text-xs mb-3" style={{ color: isDark ? "#64748b" : "#64748b" }}>
          Bleaching values grouped by ENSO phase. Computes Q1, Median, Q3, Mean per group.
          Shows how El Niño elevates bleaching compared to La Niña and Neutral phases.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ensoBoxPlot.map((phase) => (
            <div key={phase.phase} className="rounded-lg p-3" style={{ background: isDark ? "#0d1729" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0" }}>
              <div className="font-semibold mb-2" style={{ color: isDark ? "#5eead4" : "#0f766e" }}>{phase.phase}</div>
              {[
                { label: "Max", val: phase.max, color: "text-red-500" },
                { label: "Q3 (75th)", val: phase.q3, color: "text-orange-500" },
                { label: "Median", val: phase.median, color: "text-yellow-600" },
                { label: "Mean", val: phase.mean, color: isDark ? "text-slate-300" : "text-slate-700" },
                { label: "Q1 (25th)", val: phase.q1, color: "text-blue-500" },
                { label: "Min", val: phase.min, color: "text-green-500" },
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

      {/* Decision support */}
      <div className="rounded-xl p-4" style={{ background: isDark ? "rgba(16,185,129,0.06)" : "#ecfdf5", border: isDark ? "1px solid rgba(16,185,129,0.15)" : "1px solid #a7f3d0" }}>
        <h3 className="font-semibold mb-2" style={{ color: isDark ? "#6ee7b7" : "#065f46" }}>🧠 Explainability Decision Support</h3>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: isDark ? "#34d399" : "#047857" }}>
          <li>The top feature in MDI ranking is the primary driver of coral bleaching – target monitoring efforts there.</li>
          <li>SHAP values reveal which features push individual predictions UP (red) or DOWN (blue) from the baseline.</li>
          <li>The PDP for Temperature shows the critical temperature threshold beyond which bleaching accelerates nonlinearly.</li>
          <li>The Temperature × pH interaction heatmap identifies synergistic stress combinations to avoid.</li>
        </ul>
      </div>
    </div>
  );
}
