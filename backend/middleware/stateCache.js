// Sliding window state cache with Welford online algorithm for mean/variance
// Keeps last N readings per machine per metric — no storage bloat

const WINDOW_SIZE = 20;
const MIN_SAMPLES_FOR_DETECTION = 6; // warm-up period before anomaly detection

export class StateCache {
  constructor() {
    // { machineId: { metric: { window: number[], n, mean, M2 } } }
    this.cache = {};
    // Track previous status for state transition detection
    this.prevStatus = {};
  }

  /**
   * Update cache with a new reading.
   * Returns the previous status for this machine (for transition detection).
   */
  update(machineId, metrics, status) {
    if (!this.cache[machineId]) this.cache[machineId] = {};

    const prev = this.prevStatus[machineId] ?? null;
    this.prevStatus[machineId] = status;

    for (const [metric, value] of Object.entries(metrics)) {
      if (typeof value !== 'number') continue;

      if (!this.cache[machineId][metric]) {
        this.cache[machineId][metric] = { window: [], n: 0, mean: 0, M2: 0 };
      }

      const s = this.cache[machineId][metric];
      s.window.push(value);

      if (s.window.length > WINDOW_SIZE) {
        s.window.shift();
        // Recalculate from scratch after window eviction
        this._recalcFromWindow(s);
      } else {
        // Welford incremental update
        s.n++;
        const delta = value - s.mean;
        s.mean += delta / s.n;
        const delta2 = value - s.mean;
        s.M2 += delta * delta2;
      }
    }

    return prev;
  }

  _recalcFromWindow(s) {
    s.n = s.window.length;
    s.mean = 0;
    s.M2 = 0;
    for (let i = 0; i < s.window.length; i++) {
      const val = s.window[i];
      const delta = val - s.mean;
      s.mean += delta / (i + 1);
      s.M2 += delta * (val - s.mean);
    }
  }

  /** Returns { mean, stdDev, n } or null if insufficient samples */
  getStats(machineId, metric) {
    const s = this.cache[machineId]?.[metric];
    if (!s || s.n < MIN_SAMPLES_FOR_DETECTION) return null;

    const variance = s.n > 1 ? s.M2 / (s.n - 1) : 0;
    return {
      mean: Math.round(s.mean * 100) / 100,
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      n: s.n,
    };
  }

  /** True once we have enough samples to trust anomaly detection */
  isWarmedUp(machineId, metric) {
    const s = this.cache[machineId]?.[metric];
    return s != null && s.n >= MIN_SAMPLES_FOR_DETECTION;
  }
}
