import { MACHINE_CONFIGS } from '../simulator/machines.js';

const SIGMA_THRESHOLD = 3.0; // >3σ triggers a semantic memory push

const METRIC_META = {
  power_kw:      { label: 'Power Draw',   unit: 'kW' },
  temperature_c: { label: 'Temperature',  unit: '°C' },
  vibration_g:   { label: 'Vibration',    unit: 'g'  },
};

/**
 * Detect anomalies (>3σ deviations) for a machine reading.
 * Returns array of anomaly objects, sorted by severity (highest σ first).
 */
export function detectAnomalies(machineId, metrics, stateCache) {
  if (!MACHINE_CONFIGS[machineId]) return []; // skip main_breaker here

  const anomalies = [];

  for (const metric of ['power_kw', 'temperature_c', 'vibration_g']) {
    if (!stateCache.isWarmedUp(machineId, metric)) continue;

    const stats = stateCache.getStats(machineId, metric);
    if (!stats || stats.stdDev < 0.001) continue; // skip if variance is negligible

    const value = metrics[metric];
    const sigmas = Math.abs(value - stats.mean) / stats.stdDev;

    if (sigmas > SIGMA_THRESHOLD) {
      anomalies.push({
        metric,
        label: METRIC_META[metric].label,
        unit: METRIC_META[metric].unit,
        value: Math.round(value * 100) / 100,
        baseline: stats.mean,
        stdDev: stats.stdDev,
        sigmas: Math.round(sigmas * 10) / 10,
        direction: value > stats.mean ? 'spike' : 'drop',
      });
    }
  }

  // Sort by sigmas descending — worst anomaly first
  return anomalies.sort((a, b) => b.sigmas - a.sigmas);
}

/**
 * Detect status transitions — returns { from, to } or null.
 */
export function detectStateTransition(machineId, newStatus, prevStatus) {
  if (prevStatus !== null && prevStatus !== newStatus) {
    return { from: prevStatus, to: newStatus };
  }
  return null;
}

/**
 * Detect idle energy waste — machine is IDLE but still drawing near-full operational power.
 * This is the signature for Scenario A (Hidden Energy Leak).
 */
export function detectIdleEnergyWaste(machineId, metrics, status) {
  const config = MACHINE_CONFIGS[machineId];
  if (!config) return false;
  // IDLE + drawing ≥85% of normal baseline power = unproductive energy drain
  return status === 'IDLE' && metrics.power_kw >= config.baseline.power_kw * 0.85;
}
