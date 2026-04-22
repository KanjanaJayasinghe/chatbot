/**
 * Isolation Forest – Anomaly / Outlier Detection
 *
 * Algorithm (Liu, Ting & Zhou 2008):
 *   1. Build T Isolation Trees on random sub-samples (size ψ).
 *   2. Each iTree recursively splits data by:
 *        – Randomly select a feature q
 *        – Randomly select a split value p in [min(q), max(q)]
 *   3. Anomaly score for sample x:
 *        s(x, n) = 2^{ -E[h(x)] / c(n) }
 *      where h(x) = average path length to isolation across all trees
 *            c(n) = average path length of an unsuccessful BST search
 *                 = 2·H(n-1) − 2(n-1)/n   (H = harmonic number)
 *   4. Threshold: scores > 0.5 are anomalies; > 0.65 are strong anomalies.
 *
 * Properties:
 *   • O(n log n) construction, O(log n) scoring
 *   • Works in high dimensions without distance measures
 *   • Naturally handles multi-modal distributions
 */

/* ─────────────── Isolation Tree Node ─────────────── */
interface ITreeNode {
  /** Is this a leaf (external node)? */
  isLeaf: boolean;
  /** Number of samples that reached this node */
  size: number;
  /** Feature index used for the split */
  splitFeature?: number;
  /** Split threshold value */
  splitValue?: number;
  left?: ITreeNode;
  right?: ITreeNode;
}

/* ─────────────── Harmonic number approximation ─────────────── */
function harmonic(n: number): number {
  // Euler–Mascheroni approximation: H(n) ≈ ln(n) + 0.5772156649
  return n > 0 ? Math.log(n) + 0.5772156649 : 0;
}

/**
 * Expected path length of an unsuccessful BST search in a random BST of n nodes.
 * c(n) = 2·H(n−1) − 2(n−1)/n
 */
function avgPathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonic(n - 1) - (2 * (n - 1)) / n;
}

/* ─────────────── Isolation Tree ─────────────── */
class IsolationTree {
  private heightLimit: number;
  public root: ITreeNode | null = null;

  constructor(heightLimit: number) {
    this.heightLimit = heightLimit;
  }

  /** Build the iTree recursively */
  private build(X: number[][], currentHeight: number): ITreeNode {
    const n = X.length;

    // External node: reached height limit or only one sample
    if (currentHeight >= this.heightLimit || n <= 1) {
      return { isLeaf: true, size: n };
    }

    const d = X[0].length;
    // Random feature
    const q = Math.floor(Math.random() * d);
    const colVals = X.map((r) => r[q]);
    const minQ = Math.min(...colVals);
    const maxQ = Math.max(...colVals);

    // If all values are the same, cannot split → leaf
    if (minQ === maxQ) return { isLeaf: true, size: n };

    const p = minQ + Math.random() * (maxQ - minQ);
    const leftX = X.filter((r) => r[q] < p);
    const rightX = X.filter((r) => r[q] >= p);

    return {
      isLeaf: false,
      size: n,
      splitFeature: q,
      splitValue: p,
      left: this.build(leftX, currentHeight + 1),
      right: this.build(rightX, currentHeight + 1),
    };
  }

  fit(X: number[][]): this {
    this.root = this.build(X, 0);
    return this;
  }

  /**
   * Path length for a single sample x.
   * If we reach an external leaf before isolation, add c(leaf.size).
   */
  pathLength(x: number[]): number {
    let node = this.root!;
    let depth = 0;
    while (!node.isLeaf) {
      depth++;
      if (x[node.splitFeature!] < node.splitValue!) {
        node = node.left!;
      } else {
        node = node.right!;
      }
    }
    return depth + avgPathLength(node.size);
  }
}

/* ─────────────── Isolation Forest ─────────────── */
export interface AnomalyResult {
  /** Isolation Forest anomaly score ∈ (0, 1]. Scores > 0.5 indicate anomalies. */
  scores: number[];
  /** Binary label: 1 = anomaly, 0 = normal */
  labels: number[];
  /** Average path lengths across all trees (lower = more anomalous) */
  avgPathLengths: number[];
}

export class IsolationForest {
  private nEstimators: number;
  private subsampleSize: number;
  private threshold: number;
  private trees: IsolationTree[] = [];
  private psi = 256; // default sub-sample size

  constructor(nEstimators = 100, subsampleSize = 256, threshold = 0.55) {
    this.nEstimators = nEstimators;
    this.subsampleSize = subsampleSize;
    this.threshold = threshold;
  }

  /**
   * Fit the Isolation Forest.
   * @param X - Feature matrix [n_samples × n_features]
   */
  fit(X: number[][]): this {
    this.psi = Math.min(this.subsampleSize, X.length);
    const heightLimit = Math.ceil(Math.log2(this.psi));

    this.trees = Array.from({ length: this.nEstimators }, () => {
      // Sub-sample without replacement
      const shuffled = [...X].sort(() => Math.random() - 0.5);
      const sample = shuffled.slice(0, this.psi);
      return new IsolationTree(heightLimit).fit(sample);
    });
    return this;
  }

  /**
   * Compute anomaly scores for X.
   * s(x, n) = 2^{ −E[h(x)] / c(ψ) }
   */
  score(X: number[][]): AnomalyResult {
    const cn = avgPathLength(this.psi);
    const avgPathLengths = X.map((x) => {
      const total = this.trees.reduce((s, t) => s + t.pathLength(x), 0);
      return total / this.nEstimators;
    });
    const scores = avgPathLengths.map((eh) => Math.pow(2, -eh / (cn || 1)));
    const labels = scores.map((s) => (s > this.threshold ? 1 : 0));
    return { scores, labels, avgPathLengths };
  }

  /**
   * Convenience: fit + score in one call.
   */
  fitScore(X: number[][]): AnomalyResult {
    return this.fit(X).score(X);
  }
}

/* ─────────────── IQR Outlier Detection ─────────────── */

/**
 * Classical Interquartile Range (IQR) outlier detection for 1-D series.
 * An observation is an outlier if:
 *   x < Q1 − 1.5·IQR  OR  x > Q3 + 1.5·IQR
 */
export function iqrOutliers(values: number[]): {
  q1: number; q3: number; iqr: number;
  lowerFence: number; upperFence: number;
  outlierIndices: number[];
  outlierValues: number[];
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const outlierIndices = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v < lowerFence || v > upperFence)
    .map(({ i }) => i);

  return {
    q1, q3, iqr, lowerFence, upperFence,
    outlierIndices,
    outlierValues: outlierIndices.map((i) => values[i]),
  };
}
