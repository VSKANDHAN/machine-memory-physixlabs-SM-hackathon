import Supermemory from 'supermemory';

let client = null;
let enabled = false;

const CONTAINER_TAG = process.env.SM_CONTAINER_TAG || 'factory_floor';

export function initClient() {
  if (!process.env.SM_API_KEY || process.env.SM_API_KEY === 'your_supermemory_api_key_here') {
    console.warn('[Supermemory] SM_API_KEY not configured — memory layer disabled. Set it in .env to enable.');
    enabled = false;
    return;
  }

  client = new Supermemory({
    apiKey: process.env.SM_API_KEY,
    baseURL: process.env.SM_BASE_URL || 'http://localhost:6767',
  });

  enabled = true;
  console.log(`[Supermemory] Client ready → ${process.env.SM_BASE_URL || 'http://localhost:6767'} | container: ${CONTAINER_TAG}`);
}

/**
 * Push a semantic memory event to Supermemory.
 * Uses dreaming: 'instant' so memories are queryable within seconds.
 */
export async function pushEvent({ content, eventType, machineId, severity = 'info', metadata = {} }) {
  if (!enabled || !client) return null;

  try {
    const result = await client.add({
      content,
      containerTag: CONTAINER_TAG,
      dreaming: 'instant',
      metadata: {
        event_type: eventType,
        machine_id: machineId || 'factory',
        severity,
        timestamp_unix: Date.now(),
        ...metadata,
      },
    });
    console.log(`[Supermemory] ✓ Memory stored → [${eventType}] on ${machineId}`);
    return result;
  } catch (err) {
    console.error(`[Supermemory] ✗ Failed to store memory: ${err.message}`);
    return null;
  }
}

/**
 * Search memories — used by the agent endpoint.
 */
export async function searchMemories(query, { filters, limit = 8, threshold = 0.5 } = {}) {
  if (!enabled || !client) return { results: [] };

  const params = {
    q: query,
    containerTag: CONTAINER_TAG,
    searchMode: 'hybrid',
    limit,
    threshold,
    rerank: true,
  };
  if (filters) params.filters = filters;

  return await client.search.memories(params);
}

/**
 * Seed Supermemory with factory ontology + historical fault records on server startup.
 * Uses customId to prevent duplicate seeding across restarts.
 */
export async function seedFactoryKnowledge() {
  if (!enabled || !client) return;

  console.log('[Supermemory] Seeding factory ontology and historical fault records...');

  // 1. Factory Ontology — machine relationships, process flow, fault taxonomy
  await safeAdd({
    content: `FACTORY ONTOLOGY — Physix Labs Mini Production Line

Process Flow (left-to-right sequential dependency chain):
  feeder_01 (Raw Material Feeder, 5kW)
    → mixer_02 (Main Heavy Mixer, 45kW)
    → conveyor_03 (Product Conveyor Belt, 12kW)
    → packaging_04 (Rapid Packaging System, 8kW)

Energy Hierarchy:
  main_breaker monitors aggregate electrical load of all 4 machines + 10kW facility baseline.
  Normal total system draw: ~70kW. Structural tolerance: ~130kW.

Cascade Dependencies (failure propagation):
  - feeder_01 failure → mixer_02 starved of raw material → upstream production halt
  - conveyor_03 jam → packaging_04 cannot receive product → downstream output stops
  - Any single-machine fault → main_breaker energy profile shifts by at least 15-20%
  - main_breaker surge >20% above running baseline always correlates with a machine-level fault

Machine Normal Operating Baselines:
  feeder_01:   5.0kW power | 35°C temp | 0.8g vibration
  mixer_02:    45.0kW power | 65°C temp | 2.1g vibration
  conveyor_03: 12.0kW power | 40°C temp | 1.2g vibration
  packaging_04: 8.0kW power | 45°C temp | 1.5g vibration
  main_breaker: ~70kW dynamic sum + 10kW overhead

Fault Taxonomy:
  MECHANICAL: vibration >3σ above running baseline; cycle_count drops to zero
  THERMAL: temperature exceeds baseline + 20°C sustained
  ELECTRICAL: power draw >2x baseline (near-stall motor current signature)
  PROCESS: machine IDLE status with non-zero power draw equal to operational load (energy leak)
  MAINTENANCE: cumulative kWh exceeds scheduled service threshold

Maintenance Thresholds:
  mixer_02: bearing inspection + lubrication service required at 5,000 kWh cumulative runtime`,
    containerTag: CONTAINER_TAG,
    customId: 'factory_ontology_physix_v1',
    dreaming: 'instant',
    metadata: { event_type: 'ontology', machine_id: 'factory', severity: 'info' },
  });

  // 2. Historical Fault: conveyor_03 mechanical jam (6 months ago)
  await safeAdd({
    content: `Historical Fault Record [2026-01-15 09:30 UTC] — conveyor_03 Mechanical Jam:
Observed: Vibration spiked to 4.2g (baseline 1.2g, 3.3σ deviation). Power draw surged to 28kW (baseline 12kW, near-stall current). Temperature climbed to 82°C. Cycle count dropped to zero. main_breaker registered +32kW surge above normal baseline (38% over average).
Root Cause Confirmed: Belt misalignment caused by sustained overload — packaging_04 experienced simultaneous backpressure jam, forcing drive motor into stall condition.
Resolution Performed: Maintenance team physically realigned belt tensioner. Re-calibrated load sensor. Drive motor inspection — no permanent bearing damage.
Total Downtime: 8 minutes.
Corrective Actions: (1) Belt tension inspection added to weekly PM checklist. (2) Load sensor surge threshold reduced by 10%. (3) packaging_04 backpressure interlock installed.
Recurrence Risk: MODERATE — belt alignment degrades under sustained high-load cycles.`,
    containerTag: CONTAINER_TAG,
    customId: 'historical_fault_conveyor_2026_01_15',
    dreaming: 'instant',
    metadata: { event_type: 'historical_fault', machine_id: 'conveyor_03', severity: 'critical', resolved: 'true' },
  });

  // 3. Historical Fault: feeder_01 overnight idle energy drain (10 months ago)
  await safeAdd({
    content: `Historical Fault Record [2025-09-03 22:45 UTC] — feeder_01 Unproductive Idle Energy Drain:
Observed: feeder_01 completed its scheduled production batch at end of shift (22:45) but remained powered in IDLE state until 12:30 the following day — approximately 13.75 hours. Cycle count: 0. Continuous power draw: 5.1kW throughout idle period.
Wasted Energy Calculated: 70.1 kWh consumed with zero productive output.
Root Cause Confirmed: Operator error. The automatic end-of-shift shutdown routine had been manually disabled three days prior during a diagnostic maintenance window, and was never re-enabled before shift handover.
Resolution: Machine manually identified and shut down by morning floor supervisor during walkthrough at 12:30.
Corrective Actions: (1) Auto-shutdown routine lock-out now requires dual-authorization with supervisor sign-off. (2) Shift handover checklist updated to include explicit IDLE machine power verification step. (3) Energy monitoring alert threshold set at 2+ hours of IDLE power draw.
Financial Impact: Estimated $8.40 wasted energy cost at industrial tariff rate.`,
    containerTag: CONTAINER_TAG,
    customId: 'historical_fault_feeder_2025_09_03',
    dreaming: 'instant',
    metadata: { event_type: 'historical_fault', machine_id: 'feeder_01', severity: 'warning', resolved: 'true' },
  });

  console.log('[Supermemory] ✓ Factory knowledge seeded (ontology + 2 historical fault records)');
}

async function safeAdd(params) {
  try {
    await client.add(params);
  } catch (err) {
    // Duplicate customId rejection is expected on subsequent restarts — ignore
    if (!err.message?.includes('duplicate') && !err.message?.includes('409')) {
      console.warn(`[Supermemory] Seed warning: ${err.message}`);
    }
  }
}

export function isEnabled() {
  return enabled;
}
