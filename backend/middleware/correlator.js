// Cross-asset energy correlation detector
// Triggered when a machine anomaly coincides with a main_breaker surge >20%

const SURGE_THRESHOLD = 0.20; // 20% above running mean

/**
 * Check if the main_breaker is showing an anomalous surge
 * that correlates with a detected machine fault.
 *
 * @param {number} breakerPower - current breaker power reading (kW)
 * @param {{ mean: number, stdDev: number, n: number } | null} breakerStats - running stats from stateCache
 * @returns {{ detected: true, breakerPower, baseline, surgePercent } | null}
 */
export function checkBreakerCorrelation(breakerPower, breakerStats) {
  if (!breakerStats || breakerStats.n < 5 || breakerStats.mean === 0) return null;

  const surgePercent = (breakerPower - breakerStats.mean) / breakerStats.mean;

  if (surgePercent > SURGE_THRESHOLD) {
    return {
      detected: true,
      breakerPower: Math.round(breakerPower * 100) / 100,
      baseline: Math.round(breakerStats.mean * 100) / 100,
      surgePercent: Math.round(surgePercent * 100),
    };
  }
  return null;
}
