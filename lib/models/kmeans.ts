/**
 * K-Means Clustering Algorithm
 *
 * Unsupervised learning that partitions n observations into k clusters,
 * where each observation belongs to the cluster with the nearest centroid.
 *
 * Algorithm (Lloyd's algorithm):
 *   1. Initialise k centroids using K-Means++ (distance-weighted random selection)
 *   2. Assignment step  – assign every point to its closest centroid
 *   3. Update step      – recompute each centroid as the mean of its members
 *   4. Repeat 2–3 until centroids shift < tolerance (convergence)
 *
 * Complexity: O(n · k · d · i)   n=samples, k=clusters, d=dims, i=iterations
 */

export interface KMeansResult {
  /** Cluster label (0…k-1) for each data point */
  labels: number[];
  /** Final centroid vectors [k × d] */
  centroids: number[][];
  /** Total within-cluster sum of squared distances */
  inertia: number;
  /** Number of iterations until convergence */
  iterations: number;
}

export class KMeans {
  private k: number;
  private maxIterations: number;
  private tolerance: number;
  public centroids: number[][] = [];

  constructor(k: number, maxIterations = 300, tolerance = 1e-4) {
    this.k = k;
    this.maxIterations = maxIterations;
    this.tolerance = tolerance;
  }

  /** Euclidean distance between two equal-length vectors */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
  }

  /**
   * K-Means++ initialisation
   * First centroid chosen uniformly at random; each subsequent centroid
   * is chosen with probability proportional to D(x)² – the squared distance
   * to the nearest already-chosen centroid.
   * This gives O(log k) approximation guarantee over random init.
   */
  private initKMeansPlusPlus(data: number[][]): number[][] {
    const centroids: number[][] = [];
    centroids.push([...data[Math.floor(Math.random() * data.length)]]);

    for (let c = 1; c < this.k; c++) {
      const distSq = data.map((pt) =>
        Math.min(...centroids.map((cen) => this.euclideanDistance(pt, cen) ** 2))
      );
      const total = distSq.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < data.length; i++) {
        r -= distSq[i];
        if (r <= 0) { centroids.push([...data[i]]); break; }
      }
    }
    return centroids;
  }

  /** Assign each point to the closest centroid – returns label array */
  private assignClusters(data: number[][], centroids: number[][]): number[] {
    return data.map((pt) => {
      let minD = Infinity, label = 0;
      centroids.forEach((c, i) => {
        const d = this.euclideanDistance(pt, c);
        if (d < minD) { minD = d; label = i; }
      });
      return label;
    });
  }

  /** Recompute centroids as mean of all assigned members */
  private updateCentroids(data: number[][], labels: number[], dims: number): number[][] {
    const sums = Array.from({ length: this.k }, () => Array(dims).fill(0) as number[]);
    const counts = Array(this.k).fill(0) as number[];
    data.forEach((pt, i) => {
      counts[labels[i]]++;
      pt.forEach((v, d) => { sums[labels[i]][d] += v; });
    });
    return sums.map((s, i) =>
      counts[i] > 0 ? s.map((v) => v / counts[i]) : s
    );
  }

  /** Within-cluster sum of squares (inertia) */
  private inertia(data: number[][], labels: number[], centroids: number[][]): number {
    return data.reduce(
      (sum, pt, i) => sum + this.euclideanDistance(pt, centroids[labels[i]]) ** 2,
      0
    );
  }

  /**
   * Fit K-Means to the data matrix X [n × d].
   * Returns cluster labels, final centroids, inertia, and iteration count.
   */
  fit(data: number[][]): KMeansResult {
    const dims = data[0].length;
    this.centroids = this.initKMeansPlusPlus(data);
    let labels: number[] = [];
    let iters = 0;

    for (let iter = 0; iter < this.maxIterations; iter++) {
      labels = this.assignClusters(data, this.centroids);
      const newCentroids = this.updateCentroids(data, labels, dims);

      // Convergence check: largest centroid shift
      const maxShift = Math.max(
        ...this.centroids.map((c, i) => this.euclideanDistance(c, newCentroids[i]))
      );
      this.centroids = newCentroids;
      iters = iter + 1;
      if (maxShift < this.tolerance) break;
    }

    return { labels, centroids: this.centroids, inertia: this.inertia(data, labels, this.centroids), iterations: iters };
  }

  /** Predict cluster labels for unseen data using fitted centroids */
  predict(data: number[][]): number[] {
    return this.assignClusters(data, this.centroids);
  }
}

/**
 * Min-max normalise each feature to [0, 1].
 * Required before K-Means so high-magnitude features don't dominate distances.
 */
export function normalizeMinMax(
  data: number[][]
): { normalized: number[][]; mins: number[]; maxs: number[] } {
  const dims = data[0].length;
  const mins = Array(dims).fill(Infinity) as number[];
  const maxs = Array(dims).fill(-Infinity) as number[];
  data.forEach((pt) =>
    pt.forEach((v, d) => { mins[d] = Math.min(mins[d], v); maxs[d] = Math.max(maxs[d], v); })
  );
  const normalized = data.map((pt) =>
    pt.map((v, d) => (maxs[d] > mins[d] ? (v - mins[d]) / (maxs[d] - mins[d]) : 0))
  );
  return { normalized, mins, maxs };
}
