import { EventEmitter } from 'events';
import { MACHINE_CONFIGS, MACHINE_IDS, BREAKER_BASELINE_OVERHEAD } from './machines.js';

// Box-Muller transform — Gaussian noise
function gaussianNoise(mean, stdDev) {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  do { u2 = Math.random(); } while (u2 === 0);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export class FactorySimulator extends EventEmitter {
  constructor() {
    super();
    this.intervalHandle = null;
    this.tickMs = 1500;

    // Per-machine state: { status, override }
    this.machineStates = {};
    // Cumulative kWh tracker per machine (for maintenance threshold Scenario C)
    this.cumulativeKwh = {};

    for (const id of MACHINE_IDS) {
      this.machineStates[id] = { status: 'PROCESSING', override: null };
      this.cumulativeKwh[id] = 0;
    }
  }

  start() {
    this.intervalHandle = setInterval(() => this._tick(), this.tickMs);
    console.log('[Simulator] Factory simulation started — 5 assets online');
  }

  stop() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  // Inject a scenario override onto a machine
  applyScenario(machineId, override) {
    if (this.machineStates[machineId]) {
      this.machineStates[machineId].override = override;
    }
  }

  // Remove scenario override — machine returns to normal simulation
  clearScenario(machineId) {
    if (this.machineStates[machineId]) {
      this.machineStates[machineId].override = null;
      this.machineStates[machineId].status = 'PROCESSING';
    }
  }

  // Force mixer_02 cumulative kWh to just below the 5000 kWh maintenance threshold
  forceMixerMaintenanceThreshold() {
    this.cumulativeKwh['mixer_02'] = 4997;
    console.log('[Simulator] mixer_02 cumulative kWh forced to 4997 — will cross 5000 kWh threshold shortly');
  }

  _tick() {
    const timestamp = new Date().toISOString();
    const readings = {};
    const intervalHours = this.tickMs / 3600000;

    // Generate readings for 4 primary machines
    for (const id of MACHINE_IDS) {
      const config = MACHINE_CONFIGS[id];
      const { override, status } = this.machineStates[id];

      let metrics;
      if (override) {
        metrics = {
          power_kw: round2(Math.max(0, override.power_kw ?? gaussianNoise(config.baseline.power_kw, config.noiseStdDev.power_kw))),
          temperature_c: round2(Math.max(15, override.temperature_c ?? gaussianNoise(config.baseline.temperature_c, config.noiseStdDev.temperature_c))),
          vibration_g: round2(Math.max(0, override.vibration_g ?? gaussianNoise(config.baseline.vibration_g, config.noiseStdDev.vibration_g))),
          cycle_count: override.cycle_count ?? (config.normalCycleRate + Math.floor(Math.random() * 3 - 1)),
        };
      } else {
        metrics = {
          power_kw: round2(Math.max(0, gaussianNoise(config.baseline.power_kw, config.noiseStdDev.power_kw))),
          temperature_c: round2(Math.max(15, gaussianNoise(config.baseline.temperature_c, config.noiseStdDev.temperature_c))),
          vibration_g: round2(Math.max(0, gaussianNoise(config.baseline.vibration_g, config.noiseStdDev.vibration_g))),
          cycle_count: config.normalCycleRate + Math.floor(Math.random() * 3 - 1),
        };
      }

      // Accumulate kWh
      this.cumulativeKwh[id] = round2(this.cumulativeKwh[id] + metrics.power_kw * intervalHours);

      const currentStatus = override?.status ?? status;
      readings[id] = {
        timestamp,
        machine_id: id,
        machine_name: config.name,
        metrics,
        status: currentStatus,
        cumulative_kwh: this.cumulativeKwh[id],
      };
    }

    // main_breaker = sum of all active machine powers + 10kW overhead
    const totalMachinePower = Object.values(readings).reduce((sum, r) => sum + r.metrics.power_kw, 0);
    const breakerPower = round2(totalMachinePower + BREAKER_BASELINE_OVERHEAD);
    const breakerStatus = breakerPower > 130 ? 'CRITICAL' : 'PROCESSING';

    readings['main_breaker'] = {
      timestamp,
      machine_id: 'main_breaker',
      machine_name: 'Factory Main Breaker',
      metrics: {
        power_kw: breakerPower,
        temperature_c: round2(gaussianNoise(35, 0.5)),
        vibration_g: 0.10,
        cycle_count: 0,
      },
      status: breakerStatus,
      cumulative_kwh: round2(Object.values(this.cumulativeKwh).reduce((a, b) => a + b, 0)),
    };

    this.emit('telemetry', readings);
  }
}
