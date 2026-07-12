// Three scripted failure scenarios for the hackathon demo pitch

/**
 * Scenario A: Hidden Energy Leak
 * feeder_01 completes its batch but stays IDLE drawing full 5kW continuously
 */
export function triggerEnergyLeak(simulator) {
  console.log('[Scenario A] TRIGGERING: Hidden Energy Leak — feeder_01 stuck IDLE at full power draw');
  simulator.applyScenario('feeder_01', {
    power_kw: 5.1,       // still drawing operational power
    temperature_c: 35.4,
    vibration_g: 0.81,
    cycle_count: 0,       // zero productive output
    status: 'IDLE',
  });
}

/**
 * Scenario B: Mechanical Conveyor Jam
 * conveyor_03 hits a mechanical jam — near-stall motor current, severe vibration, thermal buildup
 */
export function triggerConveyorJam(simulator) {
  console.log('[Scenario B] TRIGGERING: Mechanical Conveyor Jam — conveyor_03 CRITICAL');
  simulator.applyScenario('conveyor_03', {
    power_kw: 30.0,       // 2.5x surge — near-stall current draw
    temperature_c: 88.0,  // thermal buildup from mechanical jam
    vibration_g: 4.8,     // severe mechanical stress signature
    cycle_count: 0,        // zero throughput
    status: 'CRITICAL',
  });
}

/**
 * Scenario C: Predictive Maintenance Threshold
 * Forces mixer_02 cumulative kWh past the 5,000 kWh service threshold
 */
export function triggerMaintenanceAlert(simulator) {
  console.log('[Scenario C] TRIGGERING: Maintenance Threshold — mixer_02 approaching 5000 kWh limit');
  simulator.forceMixerMaintenanceThreshold();
}

/**
 * Clear a scenario override and return machine to normal operation
 */
export function resolveScenario(simulator, machineId) {
  console.log(`[Resolution] Clearing scenario override → ${machineId} returning to normal operation`);
  simulator.clearScenario(machineId);
}
