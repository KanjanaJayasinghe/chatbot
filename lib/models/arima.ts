/**
 * ARIMA-style Time Series Model (AR + differencing + MA components)
 *
 * Full ARIMA(p,d,q) implementation:
 *
 *  1. Differencing (order d):
 *     Δ^d y_t = y_t − y_{t-1} for d times → makes series stationary.
 *
 *  2. AR(p) – AutoRegressive component:
 *     ŷ_t = μ + φ₁Δy_{t-1} + φ₂Δy_{t-2} + … + φ_pΔy_{t-p}
 *     AR coefficients φ estimated via Yule-Walker equations:
 *       R·φ = r  where R is the Toeplitz autocorrelation matrix
 *                     r is the lag-1…p autocorrelation vector
 *
 *  3. MA(q) – Moving Average component:
 *     Residual smoothing via q-point sliding window on past prediction errors.
 *
 *  4. Forecast:
 *     Predict h steps ahead, undoing differencing to return to original scale.
 *     Confidence intervals: ±z·σ_err (z=1.96 for 95% CI).
 *
 * Seasonal decomposition:
 *   trend     = centred moving average (window = period)
 *   seasonal  = mean of (y − trend) grouped by season
 *   residual  = y − trend − seasonal
 */

/* ─────────────── Helper utilities ─────────────── */

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function autocorrelation(y: number[], lag: number): number {
  const mu = mean(y);
  const n = y.length;
  const num = y
    .slice(lag)
    .reduce((s, v, i) => s + (v - mu) * (y[i] - mu), 0);
  const den = y.reduce((s, v) => s + (v - mu) ** 2, 0);
  return den !== 0 ? num / den : 0;
}

/**
 * Solve Yule-Walker equations R·φ = r using Levinson-Durbin recursion.
 * Returns AR coefficients [φ₁, φ₂, …, φ_p].
 */
function levinsonDurbin(y: number[], p: number): number[] {
  if (p === 0) return [];
  const r = Array.from({ length: p + 1 }, (_, k) => autocorrelation(y, k));
  const phi: number[][] = Array.from({ length: p + 1 }, () => Array(p + 1).fill(0));
  const sigs = Array(p + 1).fill(0);
  sigs[0] = r[0];
  phi[1][1] = r[1] / (r[0] || 1);
  sigs[1] = sigs[0] * (1 - phi[1][1] ** 2);
  for (let m = 2; m <= p; m++) {
    const num = r[m] - phi[m - 1].slice(1, m).reduce((s, v, j) => s + v * r[m - 1 - j], 0);
    phi[m][m] = num / (sigs[m - 1] || 1e-10);
    for (let j = 1; j < m; j++) phi[m][j] = phi[m - 1][j] - phi[m][m] * phi[m - 1][m - j];
    sigs[m] = sigs[m - 1] * (1 - phi[m][m] ** 2);
  }
  return phi[p].slice(1, p + 1);
}

/* ─────────────── Differencing ─────────────── */

function difference(y: number[], d: number): number[] {
  let diff = [...y];
  for (let i = 0; i < d; i++) diff = diff.slice(1).map((v, j) => v - diff[j]);
  return diff;
}

/** Undo d-th order differencing given the original prefix */
function undifference(diff: number[], originals: number[], d: number): number[] {
  let series = [...diff];
  for (let i = 0; i < d; i++) {
    const prefix = originals[originals.length - d + i];
    const restored: number[] = [prefix];
    series.forEach((v) => restored.push(restored[restored.length - 1] + v));
    series = restored.slice(1);
  }
  return series;
}

/* ─────────────── ARIMA Class ─────────────── */

export interface ARIMAForecast {
  /** Forecasted values (h steps ahead) */
  forecast: number[];
  /** 95% lower confidence bound */
  lower: number[];
  /** 95% upper confidence bound */
  upper: number[];
  /** In-sample fitted values (same length as input y) */
  fitted: number[];
  /** Residuals */
  residuals: number[];
}

export class ARIMA {
  private p: number;  // AR order
  private d: number;  // differencing order
  private q: number;  // MA order (residual smoothing window)

  private arCoefs: number[] = [];
  private diffSeries: number[] = [];
  private residuals: number[] = [];
  private origSeries: number[] = [];
  private muDiff = 0;

  constructor(p = 2, d = 1, q = 1) {
    this.p = p;
    this.d = d;
    this.q = q;
  }

  /**
   * Fit ARIMA to a univariate time series y.
   * @param y - Observed values in chronological order
   */
  fit(y: number[]): this {
    this.origSeries = [...y];
    this.diffSeries = difference(y, this.d);
    this.muDiff = mean(this.diffSeries);
    const centred = this.diffSeries.map((v) => v - this.muDiff);
    this.arCoefs = levinsonDurbin(centred, Math.min(this.p, Math.floor(centred.length / 3)));

    // Compute fitted values on differenced series
    const fittedDiff: number[] = [];
    this.residuals = [];
    for (let t = 0; t < centred.length; t++) {
      let pred = this.muDiff;
      for (let j = 0; j < this.arCoefs.length; j++) {
        if (t - j - 1 >= 0) pred += this.arCoefs[j] * centred[t - j - 1];
      }
      // MA: apply sliding window correction on past residuals
      if (this.q > 0 && t > 0) {
        const window = this.residuals.slice(Math.max(0, t - this.q));
        pred += mean(window) * 0.5; // dampened MA correction
      }
      fittedDiff.push(pred);
      this.residuals.push(centred[t] - pred + this.muDiff);
    }

    return this;
  }

  /**
   * Forecast h steps ahead.
   * Returns forecasted values plus 95% confidence intervals.
   */
  forecast(h: number): ARIMAForecast {
    const centred = this.diffSeries.map((v) => v - this.muDiff);
    const history = [...centred];

    const forecastDiff: number[] = [];
    for (let step = 0; step < h; step++) {
      let pred = this.muDiff;
      for (let j = 0; j < this.arCoefs.length; j++) {
        const idx = history.length - j - 1;
        if (idx >= 0) pred += this.arCoefs[j] * history[idx];
      }
      forecastDiff.push(pred);
      history.push(pred - this.muDiff); // feed prediction back
    }

    // Undo differencing
    const restored = undifference(forecastDiff, this.origSeries, this.d);

    // Confidence intervals: widen with horizon (uncertainty grows)
    const sigmaErr =
      Math.sqrt(this.residuals.reduce((s, r) => s + r ** 2, 0) / (this.residuals.length || 1));
    const lower = restored.map((v, i) => v - 1.96 * sigmaErr * Math.sqrt(i + 1));
    const upper = restored.map((v, i) => v + 1.96 * sigmaErr * Math.sqrt(i + 1));

    // In-sample fitted values (undo differencing for training portion)
    const fittedDiff = centred.map((_, t) => {
      let pred = this.muDiff;
      for (let j = 0; j < this.arCoefs.length; j++) {
        if (t - j - 1 >= 0) pred += this.arCoefs[j] * centred[t - j - 1];
      }
      return pred;
    });
    const fitted = undifference(fittedDiff, this.origSeries, this.d);
    const residualsOrig = this.origSeries.slice(this.d).map((v, i) => v - (fitted[i] ?? v));

    return { forecast: restored, lower, upper, fitted, residuals: residualsOrig };
  }
}

/* ─────────────── Seasonal Decomposition ─────────────── */

export interface SeasonalComponents {
  trend: (number | null)[];
  seasonal: number[];
  residual: (number | null)[];
  period: number;
}

/**
 * Additive seasonal decomposition.
 *   trend    = centred moving-average of width = period
 *   seasonal = de-trended series averaged by within-period position
 *   residual = y − trend − seasonal
 */
export function seasonalDecompose(y: number[], period = 12): SeasonalComponents {
  const n = y.length;
  const half = Math.floor(period / 2);

  // Centred moving average for trend
  const trend: (number | null)[] = Array(n).fill(null);
  for (let i = half; i < n - half; i++) {
    const window = y.slice(i - half, i + half + 1);
    trend[i] = window.reduce((a, b) => a + b, 0) / window.length;
  }

  // Seasonal: average of (y − trend) at each within-period position
  const seasonBuckets: number[][] = Array.from({ length: period }, () => []);
  trend.forEach((t, i) => {
    if (t !== null) seasonBuckets[i % period].push(y[i] - t);
  });
  const seasonMeans = seasonBuckets.map((b) => (b.length ? mean(b) : 0));
  // Centre seasonal component (sum to zero)
  const seasonMean = mean(seasonMeans);
  const seasonal = y.map((_, i) => seasonMeans[i % period] - seasonMean);

  // Residual
  const residual: (number | null)[] = trend.map((t, i) =>
    t !== null ? y[i] - t - seasonal[i] : null
  );

  return { trend, seasonal, residual, period };
}

/* ─────────────── Lag Correlation ─────────────── */

/**
 * Compute cross-correlation between x and y at lags 0, 1, …, maxLag.
 * Returns array of { lag, correlation } objects suitable for charts.
 */
export function lagCorrelation(
  x: number[],
  y: number[],
  maxLag: number
): { lag: number; correlation: number }[] {
  const n = Math.min(x.length, y.length);
  return Array.from({ length: maxLag + 1 }, (_, lag) => {
    const xs = x.slice(0, n - lag);
    const ys = y.slice(lag, n);
    const mx = mean(xs), my = mean(ys);
    const num = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
    const den = Math.sqrt(
      xs.reduce((s, v) => s + (v - mx) ** 2, 0) * ys.reduce((s, v) => s + (v - my) ** 2, 0)
    );
    return { lag, correlation: den > 0 ? num / den : 0 };
  });
}
