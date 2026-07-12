// Machine configurations and normal baselines for the Physix Labs mini production line
// Process flow: feeder_01 → mixer_02 → conveyor_03 → packaging_04

export const MACHINE_CONFIGS = {
  feeder_01: {
    id: 'feeder_01',
    name: 'Raw Material Feeder',
    role: 'Pushes raw inputs downstream to the mixer',
    baseline: { power_kw: 5.0, temperature_c: 35.0, vibration_g: 0.8 },
    noiseStdDev: { power_kw: 0.25, temperature_c: 0.8, vibration_g: 0.04 },
    normalCycleRate: 12,
  },
  mixer_02: {
    id: 'mixer_02',
    name: 'Main Heavy Mixer',
    role: 'Processes raw materials — highly energy-intensive',
    baseline: { power_kw: 45.0, temperature_c: 65.0, vibration_g: 2.1 },
    noiseStdDev: { power_kw: 1.5, temperature_c: 1.5, vibration_g: 0.12 },
    normalCycleRate: 8,
    maintenanceKwhThreshold: 5000,
  },
  conveyor_03: {
    id: 'conveyor_03',
    name: 'Product Conveyor Belt',
    role: 'Transports processed output to packaging',
    baseline: { power_kw: 12.0, temperature_c: 40.0, vibration_g: 1.2 },
    noiseStdDev: { power_kw: 0.5, temperature_c: 1.0, vibration_g: 0.07 },
    normalCycleRate: 20,
  },
  packaging_04: {
    id: 'packaging_04',
    name: 'Rapid Packaging System',
    role: 'Boxes finished items — tracks structural cycle counts',
    baseline: { power_kw: 8.0, temperature_c: 45.0, vibration_g: 1.5 },
    noiseStdDev: { power_kw: 0.35, temperature_c: 1.0, vibration_g: 0.09 },
    normalCycleRate: 15,
  },
};

// main_breaker is dynamic: sum of all active machine powers + this overhead
export const BREAKER_BASELINE_OVERHEAD = 10.0;

export const MACHINE_IDS = Object.keys(MACHINE_CONFIGS);
