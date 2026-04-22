/**
 * Linear Regression Models
 *
 * ─── Simple Linear Regression (OLS) ───────────────────────────────────────
 * Fits y = β₀ + β₁x by minimising the sum of squared residuals.
 * Closed-form (Normal Equation):
 *   β₁ = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²
 *   β₀ = ȳ - β₁·x̄
 * Goodness-of-fit: R² = 1 - SS_res / SS_tot
 *
 * ─── Multiple Linear Regression (Gradient Descent) ────────────────────────
 * Fits y = w·x + b via iterative update:
 *   wⱼ ← wⱼ - α · (2/n) Σ(ŷᵢ - yᵢ) · xᵢⱼ
 *   b  ← b  - α · (2/n) Σ(ŷᵢ - yᵢ)
 * Feature importance ≈ normalised absolute weight after standardisation.
 *
 * ─── Logistic Regression ──────────────────────────────────────────────────
 * Binary classifier: P(y=1|x) = σ(w·x + b) = 1 / (1 + e^{-z})
 * Optimised by minimising Binary Cross-Entropy via gradient descent.
 */

/* ─────────────── Simple Linear Regression ─────────────── */
export class SimpleLinearRegression {
  public slope = 0;
  public intercept = 0;
  public rSquared = 0;

  /**
   * Fit using the closed-form OLS solution.
   * @param x - 1-D predictor array
   * @param y - 1-D response array (same length as x)
   */
  fit(x: number[], y: number[]): this {
    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - xMean) * (y[i] - yMean);
      den += (x[i] - xMean) ** 2;
    }
    this.slope = den !== 0 ? num / den : 0;
    this.intercept = yMean - this.slope * xMean;

    // R² = 1 - SS_residual / SS_total
    const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const ssRes = y.reduce((s, v, i) => s + (v - this.predict(x[i])) ** 2, 0);
    this.rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return this;
  }

  predict(x: number): number { return this.slope * x + this.intercept; }
  predictMany(x: number[]): number[] { return x.map((v) => this.predict(v)); }
}

/* ─────────────── Multiple Linear Regression ─────────────── */
export class MultipleLinearRegression {
  public weights: number[] = [];
  public bias = 0;
  /** Normalised absolute weights (sums to 1) – proxy for feature importance */
  public featureImportances: number[] = [];

  private lr: number;
  private iterations: number;

  constructor(learningRate = 0.01, iterations = 500) {
    this.lr = learningRate;
    this.iterations = iterations;
  }

  /**
   * Fit via batch gradient descent on standardised features.
   * @param X - Feature matrix [n_samples × n_features]
   * @param y - Target vector [n_samples]
   */
  fit(X: number[][], y: number[]): this {
    const n = X.length;
    const d = X[0].length;
    this.weights = Array(d).fill(0) as number[];
    this.bias = 0;

    // Standardise (zero mean, unit variance) to improve convergence
    const means = Array(d).fill(0) as number[];
    const stds = Array(d).fill(1) as number[];
    for (let j = 0; j < d; j++) {
      means[j] = X.reduce((s, r) => s + r[j], 0) / n;
      stds[j] = Math.sqrt(X.reduce((s, r) => s + (r[j] - means[j]) ** 2, 0) / n) || 1;
    }
    const Xs = X.map((r) => r.map((v, j) => (v - means[j]) / stds[j]));

    for (let iter = 0; iter < this.iterations; iter++) {
      const preds = Xs.map((r) => this.weights.reduce((s, w, j) => s + w * r[j], this.bias));
      const errors = preds.map((p, i) => p - y[i]);
      this.weights = this.weights.map(
        (w, j) => w - this.lr * ((2 / n) * errors.reduce((s, e, i) => s + e * Xs[i][j], 0))
      );
      this.bias -= this.lr * ((2 / n) * errors.reduce((a, b) => a + b, 0));
    }

    const tot = this.weights.reduce((s, w) => s + Math.abs(w), 0) || 1;
    this.featureImportances = this.weights.map((w) => Math.abs(w) / tot);
    return this;
  }

  predict(X: number[][]): number[] {
    return X.map((r) => this.weights.reduce((s, w, j) => s + w * r[j], this.bias));
  }

  /** Return intercept + individual feature contributions for one sample */
  explain(x: number[]): { bias: number; contributions: number[] } {
    return {
      bias: this.bias,
      contributions: x.map((v, j) => this.weights[j] * v),
    };
  }
}

/* ─────────────── Logistic Regression ─────────────── */
export class LogisticRegression {
  public weights: number[] = [];
  public bias = 0;
  private lr: number;
  private iterations: number;

  constructor(learningRate = 0.1, iterations = 500) {
    this.lr = learningRate;
    this.iterations = iterations;
  }

  /** Numerically stable sigmoid: σ(z) = 1 / (1 + e^{-z}) */
  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  /**
   * Fit via gradient descent on Binary Cross-Entropy loss.
   * BCE = -Σ [yᵢ log(σ) + (1-yᵢ) log(1-σ)]
   */
  fit(X: number[][], y: number[]): this {
    const n = X.length;
    const d = X[0].length;
    this.weights = Array(d).fill(0) as number[];
    this.bias = 0;

    for (let iter = 0; iter < this.iterations; iter++) {
      const preds = X.map((r) =>
        this.sigmoid(this.weights.reduce((s, w, j) => s + w * r[j], this.bias))
      );
      const errors = preds.map((p, i) => p - y[i]);
      this.weights = this.weights.map(
        (w, j) => w - this.lr * (errors.reduce((s, e, i) => s + e * X[i][j], 0) / n)
      );
      this.bias -= this.lr * (errors.reduce((a, b) => a + b, 0) / n);
    }
    return this;
  }

  /** Predicted probability P(y=1|x) for each sample */
  predictProba(X: number[][]): number[] {
    return X.map((r) =>
      this.sigmoid(this.weights.reduce((s, w, j) => s + w * r[j], this.bias))
    );
  }

  predict(X: number[][], threshold = 0.5): number[] {
    return this.predictProba(X).map((p) => (p >= threshold ? 1 : 0));
  }
}
