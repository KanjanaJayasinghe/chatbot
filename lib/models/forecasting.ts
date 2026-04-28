/**
 * Site-level Forecasting Engine
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. BLEACHING FORECAST — Holt-Winters Triple Exponential Smoothing (Additive)
 *       • Level (alpha), Trend (beta), Seasonal (gamma) each learned from ALL seasons
 *       • alpha/beta/gamma optimised by 240-point grid search (min in-sample MSE)
 *       • Damped trend (phi=0.9) prevents explosive extrapolation over 12 months
 *       • 95 % CI: +-1.96*sigma_residual*sqrt(h), widens with horizon
 *       • Post-process: clamp to [0, 100]
 *
 *  2. ENSO PHASE FORECAST — AR(3) on first-order-differenced encoded phase series
 *       • Encode El Nino/Neutral/La Nina -> +1/0/-1
 *       • First-order regular differencing removes slow drift (not seasonal!)
 *       • AR(3) via Levinson-Durbin on differenced series, cumulate back to scale
 *       • Decode forecasted value -> discrete phase + confidence %
 *
 *  Root cause of old "copy-past" pattern: SARIMA seasonal differencing
 *  anchored forecast[i] = forecastDiff[i] + y[t-12], so with weak AR dynamics
 *  the result was essentially last year repeated. HW uses average seasonal
 *  factors across ALL years, so forecasts diverge from any single season.
 *
 *  All computations run entirely in-browser (no network call).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function autocorrelation(y: number[], lag: number): number {
  const mu = mean(y);
  const num = y.slice(lag).reduce((s, v, i) => s + (v - mu) * (y[i] - mu), 0);
  const den = y.reduce((s, v) => s + (v - mu) ** 2, 0);
  return den !== 0 ? num / den : 0;
}

/** Levinson-Durbin recursion — returns AR coefficients [phi_1...phi_p] */
function levinsonDurbin(y: number[], p: number): number[] {
  if (p === 0 || y.length < p + 2) return [];
  const r = Array.from({ length: p + 1 }, (_, k) => autocorrelation(y, k));
  const phi: number[][] = Array.from({ length: p + 1 }, () => Array(p + 1).fill(0));
  const sigs = Array(p + 1).fill(0);
  sigs[0] = r[0];
  phi[1][1] = r[1] / (r[0] || 1);
  sigs[1] = sigs[0] * (1 - phi[1][1] ** 2);
  for (let m = 2; m <= p; m++) {
    const num = r[m] - phi[m - 1].slice(1, m).reduce((s, v, j) => s + v * r[m - 1 - j], 0);
    phi[m][m] = num / (sigs[m - 1] || 1e-10);
    for (let j = 1; j < m; j++)
      phi[m][j] = phi[m - 1][j] - phi[m][m] * phi[m - 1][m - j];
    sigs[m] = sigs[m - 1] * (1 - phi[m][m] ** 2);
  }
  return phi[p].slice(1, p + 1);
}

/* ── Raw row type (must match rawTableRows from API) ─────────────────────────── */

export interface RawRow {
  year: number | null;
  month: number | null;
  day: number | null;
  site: string;
  bleaching: number | null;
  enso: string;
  temp: number | null;
  dhw: number | null;
  ssta: number | null;
}

/* ── Forecast output types ────────────────────────────────────────────────────── */

export interface MonthlyPoint {
  label: string;
  year: number;
  month: number;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface ENSOPoint {
  label: string;
  year: number;
  month: number;
  actualPhase: string | null;
  forecastPhase: string;
  confidence: number;
  forecastValue: number;
  actualValue: number | null;
}

export interface SiteForecastResult {
  site: string;
  nObs: number;
  bleaching: MonthlyPoint[];
  enso: ENSOPoint[];
  diagnostics: {
    arimaOrder: [number, number, number];
    rmse: number;
    mae: number;
    dataYearRange: [number, number];
  };
}

/* ── MONTH HELPERS ─────────────────────────────────────────────────────────── */

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + n;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/* ── ENSO encoding ────────────────────────────────────────────────────────── */

function encodeENSO(phase: string): number {
  const p = (phase ?? "").toLowerCase();
  if (p.includes("nino") || p.includes("el")) return 1;
  if (p.includes("nina") || p.includes("la")) return -1;
  return 0;
}

function decodeENSO(v: number): string {
  if (v > 0.4) return "El Nino";
  if (v < -0.4) return "La Nina";
  return "Neutral";
}

function ensoConfidence(v: number): number {
  const abs = Math.abs(v);
  if (abs > 0.8) return Math.min(95, 70 + abs * 25);
  if (abs > 0.4) return 55 + abs * 30;
  return Math.max(40, 50 - abs * 20);
}

/* ── Holt-Winters Additive Triple Exponential Smoothing ──────────────────── */
/**
 * Forecasts a seasonal series by separately modelling Level, Trend, and
 * Seasonal factors — all estimated from the full training history.
 *
 * Unlike seasonal differencing (which anchors each forecast step to the
 * same month 12 periods ago), HW produces independent estimates that
 * reflect the current trend and average seasonal shape, not a copy of
 * last year.
 *
 * alpha, beta, gamma chosen by 240-point grid search; damped trend (phi=0.9)
 * prevents overextrapolation across the 12-month horizon.
 */
function holtWintersAdditive(
  series: number[],
  horizon: number,
  m: number = 12,
): { forecast: number[]; lower: number[]; upper: number[]; rmse: number; mae: number } {
  const n = series.length;

  if (n < m + 2) {
    const mu = mean(series);
    const s  = std(series);
    return {
      forecast: Array(horizon).fill(mu),
      lower:    Array(horizon).fill(Math.max(0, mu - 1.96 * s)),
      upper:    Array(horizon).fill(mu + 1.96 * s),
      rmse: s, mae: s,
    };
  }

  /** Run one complete HW pass and return fitted values + final state + MSE */
  function runHW(alpha: number, beta: number, gamma: number): {
    fitted: number[]; L: number; Tr: number; S: number[]; mse: number;
  } {
    const numInitSeasons = Math.min(Math.floor(n / m), 4);
    const initL = mean(series.slice(0, m));
    let initTr = 0;
    if (n >= 2 * m) {
      initTr = (mean(series.slice(m, 2 * m)) - initL) / m;
    }
    // Average seasonal deviation for each position across all init seasons
    const S0: number[] = Array(m).fill(0);
    for (let si = 0; si < numInitSeasons; si++) {
      const seasonMean = mean(series.slice(si * m, Math.min((si + 1) * m, n)));
      for (let i = 0; i < m; i++) {
        const idx = si * m + i;
        if (idx < n) S0[i] += (series[idx] - seasonMean) / numInitSeasons;
      }
    }

    let L = initL;
    let Tr = initTr;
    const S = [...S0];
    const fitted: number[] = new Array(n).fill(0);
    let mse = 0;

    for (let t = m; t < n; t++) {
      const y    = series[t];
      const pred = L + Tr + S[t % m];
      fitted[t]  = pred;
      mse       += (y - pred) ** 2;
      const prevL = L;
      L  = alpha * (y - S[t % m]) + (1 - alpha) * (L + Tr);
      Tr = beta  * (L - prevL)    + (1 - beta)  * Tr;
      S[t % m] = gamma * (y - L) + (1 - gamma) * S[t % m];
    }
    mse /= Math.max(1, n - m);
    return { fitted, L, Tr, S, mse };
  }

  // Grid search: 8 x 5 x 6 = 240 combinations
  let bestMSE = Infinity;
  let bestAlpha = 0.3, bestBeta = 0.1, bestGamma = 0.3;
  for (const alpha of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
    for (const beta of [0.01, 0.05, 0.1, 0.2, 0.3]) {
      for (const gamma of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]) {
        const { mse } = runHW(alpha, beta, gamma);
        if (mse < bestMSE) {
          bestMSE = mse;
          bestAlpha = alpha; bestBeta = beta; bestGamma = gamma;
        }
      }
    }
  }

  const { fitted, L, Tr: finalTr, S: finalS } = runHW(bestAlpha, bestBeta, bestGamma);

  // Damped trend forecast: sum of phi^1 + phi^2 + ... + phi^h multiplied by Tr
  const phi = 0.9;
  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const dampedTrend = finalTr * phi * (1 - phi ** h) / (1 - phi);
    // Season position for step h ahead
    const seasonal = finalS[(n - 1 + h) % m];
    forecast.push(L + dampedTrend + seasonal);
  }

  // Residuals from fitted (skip uninitialised first season)
  const residuals: number[] = [];
  for (let t = m; t < n; t++) residuals.push(series[t] - fitted[t]);

  const sigma = std(residuals);
  const rmse  = Math.sqrt(mean(residuals.map(r => r ** 2)));
  const mae   = mean(residuals.map(r => Math.abs(r)));

  return {
    forecast,
    lower: forecast.map((v, i) => v - 1.96 * sigma * Math.sqrt(i + 1)),
    upper: forecast.map((v, i) => v + 1.96 * sigma * Math.sqrt(i + 1)),
    rmse,
    mae,
  };
}

/* ── AR(p) on first-order-differenced series (for ENSO) ─────────────────── */
/**
 * ENSO is a multi-year oscillation — NOT an annual seasonal cycle.
 * Applying seasonal differencing (period=12) was wrong; it forced the
 * forecast to look like the same phase from 12 months ago.
 *
 * Instead: first-order differencing removes slow drift, then AR(3)
 * via Levinson-Durbin captures the oscillatory autocorrelation.
 * Forecast is cumulated back to the original scale.
 */
function arForecastRaw(
  series: number[],
  horizon: number,
  p: number = 3,
): { forecast: number[]; rmse: number; mae: number } {
  const n = series.length;
  if (n < p + 2) {
    return { forecast: Array(horizon).fill(mean(series)), rmse: 0, mae: 0 };
  }

  // First-order differencing
  const diffed   = series.slice(1).map((v, i) => v - series[i]);
  const mu       = mean(diffed);
  const centred  = diffed.map(v => v - mu);

  const order   = Math.min(p, Math.floor(centred.length / 4));
  const arCoefs = levinsonDurbin(centred, order);

  // In-sample residuals for diagnostics
  const residuals: number[] = [];
  for (let t = order; t < centred.length; t++) {
    let pred = mu;
    for (let j = 0; j < arCoefs.length; j++) {
      if (t - j - 1 >= 0) pred += arCoefs[j] * centred[t - j - 1];
    }
    residuals.push(centred[t] - (pred - mu));
  }

  // Forecast on differenced series
  const history = [...centred];
  const forecastDiff: number[] = [];
  for (let step = 0; step < horizon; step++) {
    let pred = mu;
    for (let j = 0; j < arCoefs.length; j++) {
      const idx = history.length - j - 1;
      if (idx >= 0) pred += arCoefs[j] * history[idx];
    }
    forecastDiff.push(pred);
    history.push(pred - mu);
  }

  // Cumulate: start from last observed value
  let last = series[n - 1];
  const forecast: number[] = forecastDiff.map(d => {
    last += d;
    return last;
  });

  const rmse = residuals.length > 0 ? Math.sqrt(mean(residuals.map(r => r ** 2))) : 0;
  const mae  = residuals.length > 0 ? mean(residuals.map(r => Math.abs(r))) : 0;
  return { forecast, rmse, mae };
}

/* ── Main export: run site-level forecasting ─────────────────────────────── */

export function runSiteForecasts(
  rows: RawRow[],
  sites: string[],
  targetYear: number,
  targetMonth: number,
): SiteForecastResult[] {
  const results: SiteForecastResult[] = [];

  for (const site of sites) {
    const siteRows = site === "All" ? rows : rows.filter(r => r.site === site);

    // Aggregate by year-month -> mean bleaching, dominant ENSO
    const monthMap = new Map<string, {
      bleachSum: number; bleachCount: number;
      ensoSum: number; ensoCount: number;
      year: number; month: number;
    }>();

    for (const r of siteRows) {
      if (r.year == null || r.month == null) continue;
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      const ex  = monthMap.get(key) ?? { bleachSum: 0, bleachCount: 0, ensoSum: 0, ensoCount: 0, year: r.year, month: r.month };
      if (r.bleaching != null && !isNaN(r.bleaching)) {
        ex.bleachSum += r.bleaching; ex.bleachCount++;
      }
      ex.ensoSum += encodeENSO(r.enso ?? ""); ex.ensoCount++;
      monthMap.set(key, ex);
    }

    const sorted = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    if (sorted.length < 6) continue;

    const lastEntry = sorted[sorted.length - 1];
    const lastYear  = lastEntry.year;
    const lastMonth = lastEntry.month;

    let horizon = (targetYear * 12 + targetMonth) - (lastYear * 12 + lastMonth);
    horizon = Math.min(12, Math.max(1, horizon));

    // Build time series arrays
    const bleachRaw = sorted.map(v => v.bleachCount > 0 ? v.bleachSum / v.bleachCount : NaN);
    const ensoSeries = sorted.map(v => v.ensoCount > 0 ? v.ensoSum / v.ensoCount : 0);

    // Fill NaN gaps in bleaching with linear interpolation
    const bleachFilled = bleachRaw.map((v, i, arr) => {
      if (!isNaN(v)) return v;
      const prev = arr.slice(0, i).reverse().find(x => !isNaN(x)) ?? 0;
      const next = arr.slice(i + 1).find(x => !isNaN(x)) ?? prev;
      return (prev + next) / 2;
    });

    // ── Bleaching: Holt-Winters Additive ─────────────────────────────────
    const hw = holtWintersAdditive(bleachFilled, horizon);
    const clampedForecast = hw.forecast.map(v => Math.max(0, Math.min(100, v)));
    const clampedLower    = hw.lower.map(v => Math.max(0, v));
    const clampedUpper    = hw.upper.map(v => Math.min(100, v));

    // ── ENSO: AR(3) with first-order differencing ─────────────────────────
    const ensoFit = arForecastRaw(ensoSeries, horizon, 3);

    // ── Build output: last 36 historical months + forecast months ─────────
    const histStart = Math.max(0, sorted.length - 36);

    const bleachingPoints: MonthlyPoint[] = sorted.slice(histStart).map(v => ({
      label: monthLabel(v.year, v.month),
      year: v.year, month: v.month,
      actual: v.bleachCount > 0 ? Math.round((v.bleachSum / v.bleachCount) * 100) / 100 : null,
      forecast: null, lower: null, upper: null,
    }));

    for (let h = 0; h < horizon; h++) {
      const { year, month } = addMonths(lastYear, lastMonth, h + 1);
      bleachingPoints.push({
        label: monthLabel(year, month),
        year, month, actual: null,
        forecast: Math.round(clampedForecast[h] * 100) / 100,
        lower:    Math.round(clampedLower[h] * 100) / 100,
        upper:    Math.round(clampedUpper[h] * 100) / 100,
      });
    }

    const ensoPoints: ENSOPoint[] = sorted.slice(histStart).map(v => {
      const enc = v.ensoCount > 0 ? v.ensoSum / v.ensoCount : 0;
      return {
        label: monthLabel(v.year, v.month),
        year: v.year, month: v.month,
        actualPhase: decodeENSO(enc),
        forecastPhase: decodeENSO(enc),
        confidence: ensoConfidence(enc),
        forecastValue: enc,
        actualValue: enc,
      };
    });

    for (let h = 0; h < horizon; h++) {
      const { year, month } = addMonths(lastYear, lastMonth, h + 1);
      const rawVal = ensoFit.forecast[h] ?? 0;
      ensoPoints.push({
        label: monthLabel(year, month),
        year, month,
        actualPhase: null,
        forecastPhase: decodeENSO(rawVal),
        confidence: ensoConfidence(rawVal),
        forecastValue: rawVal,
        actualValue: null,
      });
    }

    const dataYears = sorted.map(v => v.year);
    results.push({
      site,
      nObs: sorted.length,
      bleaching: bleachingPoints,
      enso: ensoPoints,
      diagnostics: {
        arimaOrder: [0, 1, 0] as [number, number, number],
        rmse: Math.round(hw.rmse * 100) / 100,
        mae:  Math.round(hw.mae * 100) / 100,
        dataYearRange: [Math.min(...dataYears), Math.max(...dataYears)],
      },
    });
  }

  return results;
}
