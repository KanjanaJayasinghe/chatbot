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
function ModelBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-green-950 border border-green-800 text-green-300 text-xs px-3 py-1.5 rounded-full">
      <span className="font-bold">🤖 {name}</span>
      <span className="text-green-500">·</span>
      <span className="text-green-400">{desc}</span>
    </div>
  );
}

// ── SectionModelTag: inline tag inside each chart section ────────────────────
function SectionModelTag({ model, method }: { model: string; method: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-green-900/50 border border-green-700/60 text-green-400 text-[10px] font-mono px-2 py-0.5 rounded ml-2">
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
  const { data, loading, error } = useDashboardData();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400"><div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌡️</div><div>Running Random Forest + SHAP…</div></div></div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const p4 = data.page4;
  if (!p4?.models?.randomForest) {
    return <div className="p-8 text-yellow-400">⚠ Driver analysis data not available. Check the API route or reload.</div>;
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
      <div>
        <h1 className="text-2xl font-bold text-white">🌡️ Environmental Drivers – Explainable AI</h1>
        <p className="text-gray-400 text-sm mt-1">Why is bleaching happening? Feature importance and AI explainability.</p>
      </div>

      {/* ── AI MODEL OVERVIEW CARD ─────────────────────────────────────────
          Model: Random Forest Regressor (lib/models/randomForest.ts)
          This card summarises the model architecture used for all charts on this page.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="bg-green-950/40 border border-green-800 rounded-xl p-4">
        {/* Primary model used on this page */}
        <ModelBadge name={rfModel.name} desc="Feature Importance + SHAP + PDP + Interaction" />
        <p className="text-xs text-green-300 mt-2 leading-relaxed">{rfModel.description}</p>
        <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
          {[
            { label: "Bootstrap Sampling", val: "80% random row sample per tree" },
            { label: "Random Subspace", val: "√d features considered per split" },
            { label: "Split Criterion", val: "Minimise within-child variance (MSE)" },
            { label: "Ensemble", val: `${rfModel.nEstimators} trees, max depth ${rfModel.maxDepth}` },
          ].map((s) => (
            <div key={s.label} className="bg-green-900/30 rounded-lg p-2">
              <div className="text-green-400 font-bold">{s.label}</div>
              <div className="text-gray-400">{s.val}</div>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">
            📊 Feature Importance (MDI)
            <SectionModelTag model="Random Forest" method="Mean Decrease Impurity" />
          </h2>
          <p className="text-xs text-gray-500 mb-1">
            <span className="text-green-400 font-mono">RandomForestRegressor.featureImportances</span> —
            importance_j = Σ (n_node/N) × ΔVariance, averaged across all {rfModel.nEstimators} trees.
            Higher = stronger driver of bleaching.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={featureImportances} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Importance (%)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis type="category" dataKey="feature" tick={{ fill: "#9ca3af", fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }} />
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">
            🧠 SHAP Summary Plot
            <SectionModelTag model="Random Forest" method="TreeSHAP Path Attribution" />
          </h2>
          <p className="text-xs text-gray-500 mb-1">
            <span className="text-green-400 font-mono">RandomForestRegressor.shapValues()</span> —
            φ_j(x) = mean over trees of Σ (child_mean − parent_mean) at each split on feature j.
            <span className="text-red-400"> Red</span> = pushes prediction UP.
            <span className="text-blue-400"> Blue</span> = pushes prediction DOWN.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="shap" name="SHAP Value" tick={{ fill: "#9ca3af", fontSize: 10 }} label={{ value: "SHAP Value (φ_j)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="feature" name="Feature" type="category" tick={{ fill: "#9ca3af", fontSize: 9 }} width={120} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs text-white">
                      <div className="font-bold">{d.feature}</div>
                      <div className="text-gray-400">Model: Random Forest (SHAP)</div>
                      <div>Feature value: {d.sampleVal?.toFixed(2)}</div>
                      <div>φ_j(x): {d.shap?.toFixed(3)} {d.shap > 0 ? "↑ bleaching" : "↓ bleaching"}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={shapScatter} opacity={0.7}>
                {shapScatter.map((entry) => (
                  <Cell
                    key={`${entry.feature}-${entry.sampleVal}`}
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">
            📈 Partial Dependence Plot – Temperature
            <SectionModelTag model="Random Forest" method="PDP Marginalisation" />
          </h2>
          <p className="text-xs text-gray-500 mb-1">
            <span className="text-green-400 font-mono">RF.predict()</span> averaged over all samples with Temperature fixed at each grid value.
            PDP(t) = (1/n) Σ f(t, x_{"{−j}"}). Reveals nonlinear Temperature → Bleaching threshold.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={pdp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="x" tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Temperature (°C)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} label={{ value: "Avg Predicted Bleaching %", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#fff", fontSize: 12 }}
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-1">
            🔗 Interaction Heatmap: Temperature × pH
            <SectionModelTag model="Random Forest" method="2-Variable PDP Grid" />
          </h2>
          <p className="text-xs text-gray-500 mb-1">
            <span className="text-green-400 font-mono">RF.predict()</span> on a Temperature × pH grid (other features held at mean).
            Cell = avg predicted bleaching. <span className="text-red-400">Red</span> = high bleaching risk combination.
          </p>
          {interactionHeatmap.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-gray-500 text-left py-1 pr-2">pH \ Temp</th>
                    {xLabels.map((x) => (
                      <th key={x} className="text-gray-400 px-2 py-1 text-center">{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yLabels.map((y) => (
                    <tr key={y}>
                      <td className="text-gray-400 pr-2 py-1">{y}</td>
                      {xLabels.map((x) => {
                        const cell = interactionHeatmap.find((d) => d.x === x && d.y === y);
                        return (
                          <td key={x} className="px-1 py-1 text-center rounded" style={{ background: cell ? heatColor(cell.value, interactionMin, interactionMax) : "#1f2937", color: "#fff" }}>
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
            <div className="text-gray-500 text-sm text-center py-8">Insufficient data for interaction heatmap</div>
          )}
        </div>
      </div>

      {/* ── CHART 5: ENSO Box Plot ───────────────────────────────────────────
          AI MODEL  : None (Descriptive Statistics)
          TECHNIQUE : Grouped box-plot statistics: Q1 / Median / Q3 / IQR per ENSO phase
          PURPOSE   : Compare bleaching distributions across El Niño / La Niña / Neutral
                      to show how large-scale climate oscillations amplify bleaching stress.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold text-white mb-1">
          📦 Bleaching Distribution by ENSO Phase
          <span className="inline-flex items-center gap-1 bg-gray-700 border border-gray-600 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded ml-2">
            METHOD: Grouped Descriptive Statistics (Q1/Median/Q3/IQR)
          </span>
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Bleaching values grouped by ENSO phase. Computes Q1, Median, Q3, Mean per group.
          Shows how El Niño elevates bleaching compared to La Niña and Neutral phases.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ensoBoxPlot.map((phase) => (
            <div key={phase.phase} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="font-semibold text-cyan-300 mb-2">{phase.phase}</div>
              {[
                { label: "Max", val: phase.max, color: "text-red-400" },
                { label: "Q3 (75th)", val: phase.q3, color: "text-orange-400" },
                { label: "Median", val: phase.median, color: "text-yellow-400" },
                { label: "Mean", val: phase.mean, color: "text-white" },
                { label: "Q1 (25th)", val: phase.q1, color: "text-blue-400" },
                { label: "Min", val: phase.min, color: "text-green-400" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-xs py-0.5 border-b border-gray-700/50">
                  <span className="text-gray-400">{s.label}</span>
                  <span className={s.color}>{s.val?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Decision support */}
      <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4">
        <h3 className="text-emerald-300 font-semibold mb-2">🧠 Explainability Decision Support</h3>
        <ul className="text-sm text-emerald-200 space-y-1 list-disc list-inside">
          <li>The top feature in MDI ranking is the primary driver of coral bleaching – target monitoring efforts there.</li>
          <li>SHAP values reveal which features push individual predictions UP (red) or DOWN (blue) from the baseline.</li>
          <li>The PDP for Temperature shows the critical temperature threshold beyond which bleaching accelerates nonlinearly.</li>
          <li>The Temperature × pH interaction heatmap identifies synergistic stress combinations to avoid.</li>
        </ul>
      </div>
    </div>
  );
}
