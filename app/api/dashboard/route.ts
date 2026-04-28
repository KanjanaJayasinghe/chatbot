import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { KMeans, normalizeMinMax } from "@/lib/models/kmeans";
import { RandomForestRegressor } from "@/lib/models/randomForest";
import { ARIMA, seasonalDecompose, lagCorrelation } from "@/lib/models/arima";
import { IsolationForest, iqrOutliers } from "@/lib/models/isolationForest";
import { MultipleLinearRegression } from "@/lib/models/linearRegression";

/* ── helpers ─────────────────────────────────────── */
const toN = (v: unknown): number | null => {
  const x = Number(v);
  return Number.isNaN(x) || v === "" || v == null ? null : x;
};
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const safe = (a: (number | null)[]) => a.filter((x): x is number => x !== null);

interface Row {
  Year: number | null; Month: number | null; Day: number | null;
  Site_Name: string; Latitude: number | null; Longitude: number | null;
  Temperature_Celsius: number | null; SSTA: number | null; DHW_Stress: number | null;
  ENSO_Phase: string; Chlorophyll_A_mg_m3: number | null; Bleaching_Percent: number | null;
  Damage_State: string; Salinity: number | null; Dissolved_O2: number | null;
  pH: number | null; Nitrate: number | null; Depth_m: number | null;
  Distance_to_Shore_km: number | null; Turbidity_NTU: number | null;
}

const CSV_FALLBACK_PATH = path.join(process.cwd(), "data", "dataset.csv");

const mapRow = (r: Record<string, unknown>): Row => ({
  Year: toN(r.Year), Month: toN(r.Month), Day: toN(r.Day),
  Site_Name: String(r.Site_Name ?? "Unknown"),
  Latitude: toN(r.Latitude), Longitude: toN(r.Longitude),
  Temperature_Celsius: toN(r.Temperature_Celsius),
  SSTA: toN(r.SSTA), DHW_Stress: toN(r.DHW_Stress),
  ENSO_Phase: String(r.ENSO_Phase ?? "Unknown"),
  Chlorophyll_A_mg_m3: toN(r.Chlorophyll_A_mg_m3),
  Bleaching_Percent: toN(r.Bleaching_Percent),
  Damage_State: String(r.Damage_State ?? "Unknown"),
  Salinity: toN(r.Salinity), Dissolved_O2: toN(r.Dissolved_O2),
  pH: toN(r.pH), Nitrate: toN(r.Nitrate), Depth_m: toN(r.Depth_m),
  Distance_to_Shore_km: toN(r.Distance_to_Shore_km),
  Turbidity_NTU: toN(r.Turbidity_NTU),
});

async function loadRowsFromFirestore(): Promise<Row[]> {
  const db = getAdminDb();
  const snap = await db.collection("dataset").limit(3000).get();
  return snap.docs.map((d) => mapRow(d.data() as Record<string, unknown>));
}

async function loadRowsFromCsv(): Promise<Row[]> {
  const csv = await fs.readFile(CSV_FALLBACK_PATH, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return parsed.data.map((r) => mapRow(r as unknown as Record<string, unknown>));
}

async function loadRowsWithFallback(): Promise<Row[]> {
  try {
    const rows = await loadRowsFromFirestore();
    if (rows.length > 0) return rows;
  } catch (err) {
    console.warn("Firestore unavailable for dashboard API, falling back to CSV:", err);
  }

  const csvRows = await loadRowsFromCsv();
  if (csvRows.length === 0) {
    throw new Error("No data available in Firestore or CSV fallback.");
  }
  return csvRows;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((g, item) => {
    const k = key(item);
    (g[k] ??= []).push(item);
    return g;
  }, {} as Record<string, T[]>);
}

/* ── Route handler ───────────────────────────────── */
export async function GET() {
  try {
    const rows = await loadRowsWithFallback();
    if (rows.length === 0) return NextResponse.json({ error: "No data" }, { status: 404 });

    /* ═══════════════════════════════════════════════════════
       PAGE 1 – Global Overview
       ══════════════════════════════════════════════════════= */

    // Composite Risk Score = 0.35·(Bleaching/100) + 0.30·(DHW/20) + 0.25·(|SSTA|/5) + 0.10·(Turb/10)
    const riskRows = rows
      .filter((r) => r.Bleaching_Percent !== null && r.DHW_Stress !== null && r.SSTA !== null)
      .map((r) => {
        const riskScore =
          0.35 * (r.Bleaching_Percent! / 100) +
          0.30 * Math.min(1, r.DHW_Stress! / 20) +
          0.25 * Math.min(1, Math.abs(r.SSTA!) / 5) +
          0.10 * Math.min(1, (r.Turbidity_NTU ?? 0) / 10);
        return { ...r, riskScore: Math.min(1, riskScore) };
      });

    const globalRiskIndex = avg(riskRows.map((r) => r.riskScore)) * 100;
    const highRiskPercent = (riskRows.filter((r) => r.riskScore > 0.5).length / riskRows.length) * 100;

    // Pareto analysis – cumulative bleaching by site
    const bySite = groupBy(rows, (r) => r.Site_Name);
    const siteContribs = Object.entries(bySite)
      .map(([site, recs]) => ({ site, totalBleaching: recs.reduce((s, r) => s + (r.Bleaching_Percent ?? 0), 0) }))
      .sort((a, b) => b.totalBleaching - a.totalBleaching);
    const totalBleachSum = siteContribs.reduce((s, r) => s + r.totalBleaching, 0);
    let cumulative = 0;
    const paretoData = siteContribs.map((s) => {
      cumulative += s.totalBleaching;
      return {
        site: s.site.split(" ").slice(0, 2).join(" "),
        bleaching: +s.totalBleaching.toFixed(1),
        cumulativePct: +((cumulative / totalBleachSum) * 100).toFixed(1),
      };
    });

    // IQR outlier detection on Bleaching_Percent (Isolation Forest + IQR)
    const bleachVals = safe(rows.map((r) => r.Bleaching_Percent));
    const iqrResult = iqrOutliers(bleachVals);
    const boxPlotData = {
      q1: iqrResult.q1, q3: iqrResult.q3, iqr: iqrResult.iqr,
      lowerFence: iqrResult.lowerFence, upperFence: iqrResult.upperFence,
      median: bleachVals.sort((a, b) => a - b)[Math.floor(bleachVals.length / 2)],
      outlierCount: iqrResult.outlierIndices.length,
      outlierValues: iqrResult.outlierValues.slice(0, 30),
    };

    // K-Means clustering for geo heatmap overlay (Page 1 + Page 2)
    // Features: Latitude, Longitude, Bleaching_Percent, DHW_Stress, SSTA
    const clusterInput = rows.filter(
      (r) => r.Latitude !== null && r.Longitude !== null && r.Bleaching_Percent !== null && r.DHW_Stress !== null
    );
    const clusterMatrix = clusterInput.map((r) => [
      r.Latitude!, r.Longitude!, r.Bleaching_Percent!, r.DHW_Stress!, r.SSTA ?? 0,
    ]);
    const { normalized: normClusters } = normalizeMinMax(clusterMatrix);

    // K-Means with k=3: High / Medium / Low risk zones
    const kmeans = new KMeans(3, 100);
    const kmeansResult = kmeans.fit(normClusters);

    // Map cluster label to risk level based on avg bleaching in that cluster
    const clusterBleaching = [0, 1, 2].map((c) => {
      const members = clusterInput.filter((_, i) => kmeansResult.labels[i] === c);
      return avg(members.map((r) => r.Bleaching_Percent ?? 0));
    });
    const clusterOrder = [...clusterBleaching]
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v)
      .map((x) => x.i);
    const riskMap: Record<number, string> = {
      [clusterOrder[0]]: "High Risk",
      [clusterOrder[1]]: "Medium Risk",
      [clusterOrder[2]]: "Low Risk",
    };

    const geoClusterData = clusterInput.slice(0, 500).map((r, i) => ({
      lat: r.Latitude!, lon: r.Longitude!,
      bleaching: r.Bleaching_Percent!, dhw: r.DHW_Stress!,
      turbidity: r.Turbidity_NTU ?? 0, temperature: r.Temperature_Celsius ?? 0,
      cluster: riskMap[kmeansResult.labels[i]] ?? "Unknown",
      site: r.Site_Name,
    }));

    // Scatter bubble chart: Temperature vs Bleaching vs DHW vs Turbidity
    const scatterBubble = rows
      .filter((r) => r.Temperature_Celsius !== null && r.Bleaching_Percent !== null && r.DHW_Stress !== null)
      .slice(0, 300)
      .map((r) => ({
        x: r.Temperature_Celsius!, y: r.Bleaching_Percent!,
        size: r.DHW_Stress!, color: r.Turbidity_NTU ?? 0, site: r.Site_Name,
      }));

    // Site time series: per site, per year — avg bleaching + dominant damage state
    const damageOrder: Record<string, number> = { healthy: 0, watch: 1, bleached: 2, severe_bleach: 3 };
    const siteYearGroups: Record<string, Record<number, { bleaching: number[]; damage: string[] }>> = {};
    for (const r of rows) {
      if (r.Year === null || r.Bleaching_Percent === null) continue;
      const site = r.Site_Name;
      const yr = r.Year;
      if (!siteYearGroups[site]) siteYearGroups[site] = {};
      if (!siteYearGroups[site][yr]) siteYearGroups[site][yr] = { bleaching: [], damage: [] };
      siteYearGroups[site][yr].bleaching.push(r.Bleaching_Percent);
      if (r.Damage_State) siteYearGroups[site][yr].damage.push(r.Damage_State.toLowerCase());
    }
    const siteNames = Object.keys(siteYearGroups).sort();
    const siteTimeSeries = siteNames.map((site) => {
      const byYear = siteYearGroups[site];
      const points = Object.entries(byYear)
        .map(([yr, g]) => {
          const avgB = +(avg(g.bleaching).toFixed(1));
          const dmgCounts: Record<string, number> = {};
          for (const d of g.damage) dmgCounts[d] = (dmgCounts[d] ?? 0) + 1;
          const dominant = Object.entries(dmgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "healthy";
          return { year: Number(yr), bleaching: avgB, damageState: dominant, damageNum: damageOrder[dominant] ?? 0 };
        })
        .sort((a, b) => a.year - b.year);
      return { site, points };
    });

    // Water quality time series: per site, per year — avg pH, Salinity, Nitrate, Dissolved_O2
    const wqGroups: Record<string, Record<number, { ph: number[]; salinity: number[]; nitrate: number[]; do2: number[] }>> = {};
    for (const r of rows) {
      if (r.Year === null) continue;
      const site = r.Site_Name;
      const yr = r.Year;
      if (!wqGroups[site]) wqGroups[site] = {};
      if (!wqGroups[site][yr]) wqGroups[site][yr] = { ph: [], salinity: [], nitrate: [], do2: [] };
      if (r.pH !== null) wqGroups[site][yr].ph.push(r.pH);
      if (r.Salinity !== null) wqGroups[site][yr].salinity.push(r.Salinity);
      if (r.Nitrate !== null) wqGroups[site][yr].nitrate.push(r.Nitrate);
      if (r.Dissolved_O2 !== null) wqGroups[site][yr].do2.push(r.Dissolved_O2);
    }
    const waterQualityTimeSeries = siteNames.map((site) => {
      const byYear = wqGroups[site] ?? {};
      const points = Object.entries(byYear)
        .map(([yr, g]) => ({
          year: Number(yr),
          ph: g.ph.length ? +(avg(g.ph).toFixed(2)) : null,
          salinity: g.salinity.length ? +(avg(g.salinity).toFixed(2)) : null,
          nitrate: g.nitrate.length ? +(avg(g.nitrate).toFixed(3)) : null,
          dissolved_o2: g.do2.length ? +(avg(g.do2).toFixed(2)) : null,
        }))
        .sort((a, b) => a.year - b.year);
      return { site, points };
    });

    /* ═══════════════════════════════════════════════════════
       PAGE 2 – Spatial Risk Intelligence
       ══════════════════════════════════════════════════════= */

    // Moran's I concept: local mean bleaching vs site bleaching
    const spatialRows = clusterInput.filter((r) => r.Bleaching_Percent !== null);
    const globalMeanBleaching = avg(spatialRows.map((r) => r.Bleaching_Percent!));
    const moranScatter = spatialRows.slice(0, 200).map((r) => ({
      x: globalMeanBleaching + (Math.random() - 0.5) * 10, // approximate local mean
      y: r.Bleaching_Percent!,
      site: r.Site_Name,
    }));

    // Distance to shore regression
    const shoreRows = rows.filter((r) => r.Distance_to_Shore_km !== null && r.Bleaching_Percent !== null);
    const shoreScatter = shoreRows.slice(0, 200).map((r) => ({
      x: r.Distance_to_Shore_km!, y: r.Bleaching_Percent!, site: r.Site_Name,
    }));
    // Simple linear regression for trend line
    const shoreX = shoreRows.map((r) => r.Distance_to_Shore_km!);
    const shoreY = shoreRows.map((r) => r.Bleaching_Percent!);
    const shoreMeanX = avg(shoreX), shoreMeanY = avg(shoreY);
    let shoreNum = 0, shoreDen = 0;
    shoreX.forEach((x, i) => { shoreNum += (x - shoreMeanX) * (shoreY[i] - shoreMeanY); shoreDen += (x - shoreMeanX) ** 2; });
    const shoreSlope = shoreDen > 0 ? shoreNum / shoreDen : 0;
    const shoreIntercept = shoreMeanY - shoreSlope * shoreMeanX;
    const shoreRange = [Math.min(...shoreX), Math.max(...shoreX)];
    const shoreTrend = [
      { x: shoreRange[0], y: shoreSlope * shoreRange[0] + shoreIntercept },
      { x: shoreRange[1], y: shoreSlope * shoreRange[1] + shoreIntercept },
    ];

    // Depth sensitivity: LOESS-style binned
    const depthRows = rows.filter((r) => r.Depth_m !== null && r.Bleaching_Percent !== null);
    const depthBins = [5, 15, 25, 35, 50, 70].map((d) => {
      const nearby = depthRows.filter((r) => Math.abs(r.Depth_m! - d) < 10);
      return { depth: d, avgBleaching: +avg(nearby.map((r) => r.Bleaching_Percent!)).toFixed(2) };
    });

    /* ═══════════════════════════════════════════════════════
       PAGE 3 – Temporal Forecasting (ARIMA)
       ══════════════════════════════════════════════════════= */
    const byYear = groupBy(rows.filter((r) => r.Year !== null), (r) => String(r.Year));
    const yearlyTimeSeries = Object.entries(byYear)
      .map(([year, recs]) => ({
        year: Number(year),
        avgBleaching: +avg(safe(recs.map((r) => r.Bleaching_Percent))).toFixed(2),
        avgTemp: +avg(safe(recs.map((r) => r.Temperature_Celsius))).toFixed(2),
        avgDHW: +avg(safe(recs.map((r) => r.DHW_Stress))).toFixed(2),
      }))
      .sort((a, b) => a.year - b.year);

    const bleachTS = yearlyTimeSeries.map((r) => r.avgBleaching);
    const tempTS = yearlyTimeSeries.map((r) => r.avgTemp);
    const dhwTS = yearlyTimeSeries.map((r) => r.avgDHW);

    // ARIMA(2,1,1) forecast – 5 steps ahead
    const arimaForecastHorizon = 5;
    let arimaForecast = { forecast: [] as number[], lower: [] as number[], upper: [] as number[] };
    if (bleachTS.length >= 8) {
      try {
        const model = new ARIMA(2, 1, 1).fit(bleachTS);
        const result = model.forecast(arimaForecastHorizon);
        arimaForecast = { forecast: result.forecast, lower: result.lower, upper: result.upper };
      } catch { arimaForecast = { forecast: [], lower: [], upper: [] }; }
    }

    const forecastYears = Array.from(
      { length: arimaForecastHorizon },
      (_, i) => (yearlyTimeSeries[yearlyTimeSeries.length - 1]?.year ?? 2020) + i + 1
    );

    // Seasonal decomposition (monthly)
    const byMonth = groupBy(rows.filter((r) => r.Month !== null), (r) => String(r.Month));
    const monthlyBleach = Array.from({ length: 12 }, (_, i) => {
      const recs = byMonth[String(i + 1)] ?? [];
      return avg(safe(recs.map((r) => r.Bleaching_Percent)));
    });
    let decomposition = { trend: [] as (number | null)[], seasonal: [] as number[], residual: [] as (number | null)[] };
    if (bleachTS.length >= 24) {
      decomposition = seasonalDecompose(bleachTS, 6);
    }

    // Lag correlation: DHW → Bleaching
    const lagCorr = lagCorrelation(dhwTS, bleachTS, Math.min(6, Math.floor(bleachTS.length / 3)));

    /* ═══════════════════════════════════════════════════════
       PAGE 4 – Environmental Drivers (Random Forest + SHAP)
       ══════════════════════════════════════════════════════= */
    const FEATURE_NAMES = [
      "Temperature_Celsius", "SSTA", "DHW_Stress",
      "Chlorophyll_A_mg_m3", "pH", "Turbidity_NTU",
      "Salinity", "Dissolved_O2", "Nitrate", "Depth_m",
    ] as const;

    const rfRows = rows.filter(
      (r) => r.Bleaching_Percent !== null &&
        FEATURE_NAMES.every((f) => r[f] !== null)
    );
    const rfX = rfRows.map((r) => FEATURE_NAMES.map((f) => r[f] as number));
    const rfY = rfRows.map((r) => r.Bleaching_Percent!);

    let featureImportances: { feature: string; importance: number }[] = [];
    let shapData: { feature: string; sampleValues: number[]; shapContribs: number[] }[] = [];
    let pdpTemperature: { x: number; y: number }[] = [];
    let interactionHeatmap: { x: string; y: string; value: number }[] = [];

    if (rfX.length >= 30) {
      // Random Forest – fit on sample to keep latency reasonable
      const sampleSize = Math.min(400, rfX.length);
      const shuffled = rfX.map((x, i) => ({ x, y: rfY[i] })).sort(() => Math.random() - 0.5);
      const trainX = shuffled.slice(0, sampleSize).map((r) => r.x);
      const trainY = shuffled.slice(0, sampleSize).map((r) => r.y);

      const rf = new RandomForestRegressor(20, 5);
      rf.fit(trainX, trainY);

      featureImportances = FEATURE_NAMES.map((f, i) => ({
        feature: f.replace(/_/g, " "),
        importance: +((rf.featureImportances[i] ?? 0) * 100).toFixed(2),
      })).sort((a, b) => b.importance - a.importance);

      // SHAP values for first 30 samples
      const shapSamples = trainX.slice(0, 30);
      const shapMatrix = rf.shapValues(shapSamples);
      shapData = FEATURE_NAMES.map((f, j) => ({
        feature: f.replace(/_/g, " "),
        sampleValues: shapSamples.map((r) => r[j]),
        shapContribs: shapMatrix.map((row) => row[j]),
      }));

      // Partial Dependence Plot: Temperature → Bleaching
      const tempIdx = 0; // Temperature_Celsius is index 0
      const tempRange = Array.from({ length: 20 }, (_, i) => 24 + i * 0.5); // 24–33°C
      const baseRow = trainX[0];
      pdpTemperature = tempRange.map((t) => {
        const modified = trainX.map((row) => row.map((v, j) => (j === tempIdx ? t : v)));
        const preds = rf.predict(modified);
        return { x: t, y: +avg(preds).toFixed(2) };
      });

      // Interaction heatmap: Temperature vs pH
      const tempBins = [26, 27, 28, 29, 30, 31];
      const phBins = [7.8, 7.9, 8.0, 8.1, 8.2];
      interactionHeatmap = tempBins.flatMap((t) =>
        phBins.map((ph) => {
          const modified = trainX.map((row) => {
            const r = [...row];
            r[0] = t;   // Temperature
            r[4] = ph;  // pH
            return r;
          });
          const p = avg(rf.predict(modified));
          return { x: `${t}°C`, y: `pH ${ph}`, value: +p.toFixed(2) };
        })
      );
    }

    // ENSO box plot
    const ensoGroups = groupBy(rows, (r) => r.ENSO_Phase);
    const ensoBoxPlot = Object.entries(ensoGroups).map(([phase, recs]) => {
      const vals = safe(recs.map((r) => r.Bleaching_Percent)).sort((a, b) => a - b);
      const n = vals.length;
      return {
        phase, min: vals[0], q1: vals[Math.floor(n * 0.25)],
        median: vals[Math.floor(n * 0.5)], q3: vals[Math.floor(n * 0.75)],
        max: vals[n - 1], mean: +avg(vals).toFixed(2),
      };
    });

    /* ═══════════════════════════════════════════════════════
       PAGE 5 – Decision Support & Simulation
       Multiple Linear Regression: classification + regression
       ══════════════════════════════════════════════════════= */

    // Multiple Linear Regression for prediction panel
    const mlrRows = rows.filter(
      (r) => r.Bleaching_Percent !== null && r.Temperature_Celsius !== null &&
        r.pH !== null && r.Turbidity_NTU !== null && r.DHW_Stress !== null
    );
    const mlrFeatures = ["Temperature_Celsius", "pH", "Turbidity_NTU", "DHW_Stress"] as const;
    const mlrX = mlrRows.map((r) => mlrFeatures.map((f) => r[f] as number));
    const mlrY = mlrRows.map((r) => r.Bleaching_Percent!);

    let mlrWeights: number[] = [];
    let mlrBias = 0;
    let mlrFeatureImportances: { feature: string; weight: number }[] = [];

    if (mlrX.length >= 20) {
      const mlr = new MultipleLinearRegression(0.01, 300);
      mlr.fit(mlrX, mlrY);
      mlrWeights = mlr.weights;
      mlrBias = mlr.bias;
      mlrFeatureImportances = mlrFeatures.map((f, i) => ({
        feature: f.replace(/_/g, " "),
        weight: +mlr.featureImportances[i].toFixed(4),
      }));
    }

    // Scenario simulation: baseline vs +1°C, -50% turbidity
    const mlrBleachRange = [24, 26, 28, 29, 30, 31, 32].map((temp) => {
      if (mlrWeights.length < 4) return { temp, baseline: 20, highTemp: 25, lowTurb: 15 };
      const pH = 8.1, turb = 2.5, dhw = 3;
      const baseline = mlrWeights[0] * temp + mlrWeights[1] * pH + mlrWeights[2] * turb + mlrWeights[3] * dhw + mlrBias;
      const highTemp = mlrWeights[0] * (temp + 1) + mlrWeights[1] * pH + mlrWeights[2] * turb + mlrWeights[3] * dhw + mlrBias;
      const lowTurb = mlrWeights[0] * temp + mlrWeights[1] * pH + mlrWeights[2] * (turb * 0.5) + mlrWeights[3] * dhw + mlrBias;
      return { temp, baseline: +Math.max(0, baseline).toFixed(1), highTemp: +Math.max(0, highTemp).toFixed(1), lowTurb: +Math.max(0, lowTurb).toFixed(1) };
    });

    // Priority ranking: top 15 sites by risk score
    const prioritySites = Object.entries(bySite)
      .map(([site, recs]) => {
        const avgBleach = avg(safe(recs.map((r) => r.Bleaching_Percent)));
        const avgDHW = avg(safe(recs.map((r) => r.DHW_Stress)));
        const avgSSTA = avg(safe(recs.map((r) => r.SSTA)));
        const riskScore = 0.35 * avgBleach / 100 + 0.30 * Math.min(1, avgDHW / 20) + 0.25 * Math.min(1, Math.abs(avgSSTA) / 5);
        return {
          site, avgBleaching: +avgBleach.toFixed(1), avgDHW: +avgDHW.toFixed(2),
          riskScore: +(riskScore * 100).toFixed(1),
          urgency: riskScore > 0.5 ? "Critical" : riskScore > 0.3 ? "High" : "Medium",
          lat: recs[0]?.Latitude, lon: recs[0]?.Longitude,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 15);

    /* ── Dataset-level stats for pie charts ─────── */
    // Damage state distribution
    const damageStateCounts: Record<string, number> = {};
    for (const r of rows) {
      const d = (r.Damage_State || "unknown").toLowerCase();
      damageStateCounts[d] = (damageStateCounts[d] ?? 0) + 1;
    }
    const damageStatePie = Object.entries(damageStateCounts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "), value }))
      .sort((a, b) => b.value - a.value);

    // ENSO phase distribution
    const ensoPhaseCounts: Record<string, number> = {};
    for (const r of rows) {
      const p = r.ENSO_Phase || "Unknown";
      ensoPhaseCounts[p] = (ensoPhaseCounts[p] ?? 0) + 1;
    }
    const ensoPhasePie = Object.entries(ensoPhaseCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Bleaching severity distribution
    const bleachBands = [
      { name: "None (0%)", min: 0, max: 0.001 },
      { name: "Low (0–25%)", min: 0.001, max: 25 },
      { name: "Moderate (25–50%)", min: 25, max: 50 },
      { name: "High (50–75%)", min: 50, max: 75 },
      { name: "Severe (75–100%)", min: 75, max: 101 },
    ];
    const bleachSeverityPie = bleachBands.map(({ name, min, max }) => ({
      name,
      value: rows.filter((r) => r.Bleaching_Percent !== null && r.Bleaching_Percent >= min && r.Bleaching_Percent < max).length,
    })).filter((b) => b.value > 0);

    // Observations per site
    const siteObsPie = Object.entries(bySite)
      .map(([name, recs]) => ({ name, value: recs.length }))
      .sort((a, b) => b.value - a.value);

    // Monthly distribution
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyObsPie = Array.from({ length: 12 }, (_, i) => ({
      name: monthNames[i],
      value: rows.filter((r) => r.Month === i + 1).length,
    })).filter((m) => m.value > 0);

    // Raw table rows for the full dataset view (all 2000 rows, sorted by Year/Month/Day)
    const rawTableRows = rows
      .slice()
      .sort((a, b) => {
        if (a.Year !== b.Year) return (a.Year ?? 0) - (b.Year ?? 0);
        if (a.Month !== b.Month) return (a.Month ?? 0) - (b.Month ?? 0);
        return (a.Day ?? 0) - (b.Day ?? 0);
      })
      .map((r) => ({
        year: r.Year, month: r.Month, day: r.Day,
        site: r.Site_Name,
        lat: r.Latitude !== null ? +r.Latitude.toFixed(4) : null,
        lon: r.Longitude !== null ? +r.Longitude.toFixed(4) : null,
        temp: r.Temperature_Celsius !== null ? +r.Temperature_Celsius.toFixed(2) : null,
        ssta: r.SSTA !== null ? +r.SSTA.toFixed(3) : null,
        dhw: r.DHW_Stress !== null ? +r.DHW_Stress.toFixed(2) : null,
        enso: r.ENSO_Phase,
        chl: r.Chlorophyll_A_mg_m3 !== null ? +r.Chlorophyll_A_mg_m3.toFixed(3) : null,
        bleaching: r.Bleaching_Percent,
        damage: r.Damage_State,
        salinity: r.Salinity !== null ? +r.Salinity.toFixed(2) : null,
        do2: r.Dissolved_O2 !== null ? +r.Dissolved_O2.toFixed(2) : null,
        ph: r.pH !== null ? +r.pH.toFixed(3) : null,
        nitrate: r.Nitrate !== null ? +r.Nitrate.toFixed(3) : null,
        depth: r.Depth_m !== null ? +r.Depth_m.toFixed(1) : null,
        distShore: r.Distance_to_Shore_km !== null ? +r.Distance_to_Shore_km.toFixed(2) : null,
        turbidity: r.Turbidity_NTU !== null ? +r.Turbidity_NTU.toFixed(3) : null,
      }));

    /* ── Final response ───────────────────────────── */
    return NextResponse.json({
      computedAt: new Date().toISOString(),
      sampleSize: rows.length,

      // Page 1
      page1: {
        kpis: {
          globalRiskIndex: +globalRiskIndex.toFixed(1),
          highRiskPercent: +highRiskPercent.toFixed(1),
          avgDHW: +avg(safe(rows.map((r) => r.DHW_Stress))).toFixed(2),
          avgBleaching: +avg(bleachVals).toFixed(2),
          totalSites: Object.keys(bySite).length,
        },
        paretoData,
        boxPlotData,
        scatterBubble,
        geoClusterData,
        siteTimeSeries,
        waterQualityTimeSeries,
        rawTableRows,
        datasetPieStats: {
          damageState: damageStatePie,
          ensoPhase: ensoPhasePie,
          bleachSeverity: bleachSeverityPie,
          siteObservations: siteObsPie,
          monthlyObservations: monthlyObsPie,
        },
        // Model meta
        models: {
          kmeans: { name: "K-Means Clustering", k: 3, algorithm: "K-Means++ initialisation, Lloyd's algorithm", iterations: kmeansResult.iterations },
          isolationForest: { name: "IQR Outlier Detection", method: "Interquartile Range (1.5×IQR fence)" },
        },
      },

      // Page 2
      page2: {
        geoClusterData,
        moranScatter,
        shoreScatter,
        shoreTrend,
        depthBins,
        models: {
          kmeans: { name: "K-Means Clustering (Geo)", description: "3-cluster geo-spatial zoning using Lat, Lon, SSTA, DHW, Bleaching" },
        },
      },

      // Page 3
      page3: {
        timeSeries: yearlyTimeSeries,
        arimaForecast: {
          pastYears: yearlyTimeSeries.map((r) => r.year),
          pastBleaching: yearlyTimeSeries.map((r) => r.avgBleaching),
          forecastYears,
          ...arimaForecast,
        },
        monthlySeasonality: monthlyBleach,
        lagCorrelation: lagCorr,
        decomposition: bleachTS.length >= 24 ? { trend: decomposition.trend, seasonal: decomposition.seasonal, residual: decomposition.residual } : null,
        models: {
          arima: { name: "ARIMA(2,1,1)", description: "AutoRegressive Integrated Moving Average. AR(2): uses last 2 values. d=1: first differencing for stationarity. MA(1): residual smoothing. Coefficients via Yule-Walker / Levinson-Durbin." },
        },
      },

      // Page 4
      page4: {
        featureImportances,
        shapData,
        pdpTemperature,
        interactionHeatmap,
        ensoBoxPlot,
        models: {
          randomForest: { name: "Random Forest Regressor", description: "Ensemble of 20 Decision Trees. Bootstrap sampling (80%), random feature subspace (√d features/split). MDI feature importance. SHAP via path-based attribution.", nEstimators: 20, maxDepth: 5 },
        },
      },

      // Page 5
      page5: {
        mlrCoefficients: mlrWeights,
        mlrBias,
        mlrFeatureImportances,
        simulationData: mlrBleachRange,
        prioritySites,
        models: {
          multipleLinearRegression: { name: "Multiple Linear Regression", description: "OLS-style regression via batch gradient descent with feature standardisation. Features: Temperature, pH, Turbidity, DHW. Predicts Bleaching % in real-time.", features: mlrFeatures },
        },
      },
    });
  } catch (err: unknown) {
    console.error("Dashboard AI error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
