/**
 * Random Forest Regressor / Feature Importance
 *
 * Ensemble of Decision Trees trained with:
 *   • Bootstrap sampling   – each tree sees a random 80% subset of rows
 *   • Random feature subspace – each split considers √d candidate features
 *   • Variance-based splitting – minimise intra-child variance (regression MSE)
 *
 * Prediction: average across all trees (bagging).
 *
 * Feature Importance (Mean Decrease Impurity – MDI):
 *   importanceⱼ = Σ_trees Σ_splits_on_j  (nᵢ / N) · ΔVariance
 * Normalised to sum to 1.
 *
 * SHAP-style (TreeSHAP approximation):
 *   Contribution of feature j for sample x ≈
 *     mean over trees of (leaf_value_with_j − leaf_value_without_j)
 *   Full SHAP requires exponential combinations; here we use an efficient
 *   path-based approximation: at each split on feature j, track the value
 *   change attributed to j.
 */

/* ─────────────── Decision Tree Node ─────────────── */
interface TreeNode {
  featureIndex?: number;    // column index to split on
  threshold?: number;       // split threshold
  value?: number;           // leaf prediction (mean of samples)
  left?: TreeNode;
  right?: TreeNode;
  impurityDecrease?: number; // weighted variance reduction for MDI
  sampleCount?: number;
}

/* ─────────────── Decision Tree (CART, regression) ─────────────── */
class DecisionTree {
  private maxDepth: number;
  private minSamplesSplit: number;
  public root: TreeNode | null = null;
  /** featureIndex → accumulated impurity decrease */
  public featureImportances: Record<number, number> = {};
  public totalSamples = 0;

  constructor(maxDepth = 8, minSamplesSplit = 5) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  private variance(y: number[]): number {
    if (y.length === 0) return 0;
    const m = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((s, v) => s + (v - m) ** 2, 0) / y.length;
  }

  private mean(y: number[]): number {
    return y.length > 0 ? y.reduce((a, b) => a + b, 0) / y.length : 0;
  }

  /**
   * Find the best (featureIndex, threshold) split that maximises
   * weighted variance reduction.
   */
  private bestSplit(
    X: number[][],
    y: number[],
    features: number[]
  ): { featureIndex: number; threshold: number; gain: number } | null {
    const parentVar = this.variance(y);
    let bestGain = 0;
    let best: { featureIndex: number; threshold: number; gain: number } | null = null;

    for (const fIdx of features) {
      const sorted = [...new Set(X.map((r) => r[fIdx]))].sort((a, b) => a - b);
      for (let t = 0; t < sorted.length - 1; t++) {
        const threshold = (sorted[t] + sorted[t + 1]) / 2;
        const leftY = y.filter((_, i) => X[i][fIdx] <= threshold);
        const rightY = y.filter((_, i) => X[i][fIdx] > threshold);
        if (leftY.length === 0 || rightY.length === 0) continue;

        const gain =
          parentVar -
          (leftY.length / y.length) * this.variance(leftY) -
          (rightY.length / y.length) * this.variance(rightY);

        if (gain > bestGain) {
          bestGain = gain;
          best = { featureIndex: fIdx, threshold, gain };
        }
      }
    }
    return best;
  }

  private buildNode(X: number[][], y: number[], depth: number, numFeatures: number): TreeNode {
    if (depth >= this.maxDepth || y.length < this.minSamplesSplit) {
      return { value: this.mean(y), sampleCount: y.length };
    }

    // Random feature subspace: choose √d features at each split
    const all = Array.from({ length: numFeatures }, (_, i) => i);
    const k = Math.max(1, Math.round(Math.sqrt(numFeatures)));
    const features = all.sort(() => Math.random() - 0.5).slice(0, k);

    const split = this.bestSplit(X, y, features);
    if (!split || split.gain === 0) return { value: this.mean(y), sampleCount: y.length };

    // Accumulate MDI importance
    this.featureImportances[split.featureIndex] =
      (this.featureImportances[split.featureIndex] ?? 0) +
      (y.length / this.totalSamples) * split.gain;

    const leftMask = X.map((r) => r[split.featureIndex] <= split.threshold);
    const leftX = X.filter((_, i) => leftMask[i]);
    const leftY = y.filter((_, i) => leftMask[i]);
    const rightX = X.filter((_, i) => !leftMask[i]);
    const rightY = y.filter((_, i) => !leftMask[i]);

    return {
      featureIndex: split.featureIndex,
      threshold: split.threshold,
      impurityDecrease: split.gain,
      sampleCount: y.length,
      left: this.buildNode(leftX, leftY, depth + 1, numFeatures),
      right: this.buildNode(rightX, rightY, depth + 1, numFeatures),
    };
  }

  fit(X: number[][], y: number[]): this {
    this.totalSamples = y.length;
    this.featureImportances = {};
    this.root = this.buildNode(X, y, 0, X[0].length);
    return this;
  }

  predictOne(x: number[]): number {
    let node = this.root!;
    while (node.value === undefined) {
      node = x[node.featureIndex!] <= node.threshold! ? node.left! : node.right!;
    }
    return node.value;
  }
}

/* ─────────────── Random Forest ─────────────── */
export interface RandomForestResult {
  predictions: number[];
  /** Normalised MDI feature importances (length = n_features) */
  featureImportances: number[];
  /** SHAP-style per-sample contributions [n_samples × n_features] */
  shapValues: number[][];
}

export class RandomForestRegressor {
  private trees: DecisionTree[] = [];
  private nEstimators: number;
  private maxDepth: number;

  constructor(nEstimators = 30, maxDepth = 6) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
  }

  /**
   * Bootstrap sample (with replacement) of size n.
   * Returns sampled {X, y} and the out-of-bag indices.
   */
  private bootstrap(X: number[][], y: number[]): { X: number[][]; y: number[] } {
    const n = X.length;
    const indices = Array.from({ length: Math.floor(n * 0.8) }, () =>
      Math.floor(Math.random() * n)
    );
    return { X: indices.map((i) => X[i]), y: indices.map((i) => y[i]) };
  }

  /**
   * Fit the Random Forest.
   * @param X - Feature matrix [n_samples × n_features]
   * @param y - Regression target [n_samples]
   */
  fit(X: number[][], y: number[]): this {
    const d = X[0].length;
    this.trees = Array.from({ length: this.nEstimators }, () => {
      const tree = new DecisionTree(this.maxDepth);
      const { X: bX, y: bY } = this.bootstrap(X, y);
      return tree.fit(bX, bY);
    });

    // Aggregate MDI importances across trees and normalise
    const agg = Array(d).fill(0) as number[];
    this.trees.forEach((t) => {
      Object.entries(t.featureImportances).forEach(([j, v]) => { agg[Number(j)] += v; });
    });
    const tot = agg.reduce((a, b) => a + b, 0) || 1;
    this._featureImportances = agg.map((v) => v / tot);
    return this;
  }

  private _featureImportances: number[] = [];

  get featureImportances(): number[] { return this._featureImportances; }

  predict(X: number[][]): number[] {
    return X.map((x) => {
      const preds = this.trees.map((t) => t.predictOne(x));
      return preds.reduce((a, b) => a + b, 0) / preds.length;
    });
  }

  /**
   * Approximate SHAP values via "mean prediction path" heuristic.
   *
   * For each tree and each split along the prediction path for sample x,
   * we attribute the change in node mean to the splitting feature.
   * The final SHAP value for feature j is:
   *   φⱼ(x) = mean over trees of Σ_{splits on j in path} (child_mean − parent_mean)
   *
   * This is a simplified, computationally efficient variant of TreeSHAP.
   */
  shapValues(X: number[][]): number[][] {
    const d = this._featureImportances.length;
    return X.map((x) => {
      const contribs = Array(d).fill(0) as number[];
      this.trees.forEach((tree) => {
        let node = tree.root!;
        while (node.value === undefined) {
          const fIdx = node.featureIndex!;
          const child = x[fIdx] <= node.threshold! ? node.left! : node.right!;
          const parentMean = nodeValue(node);
          const childMean = nodeValue(child);
          contribs[fIdx] += (childMean - parentMean) / this.nEstimators;
          node = child;
        }
      });
      return contribs;
    });
  }
}

/** Recursively compute the average leaf value of a subtree (for SHAP path) */
function nodeValue(node: TreeNode): number {
  if (node.value !== undefined) return node.value;
  const l = nodeValue(node.left!);
  const r = nodeValue(node.right!);
  const nl = node.left?.sampleCount ?? 1;
  const nr = node.right?.sampleCount ?? 1;
  return (l * nl + r * nr) / (nl + nr);
}
