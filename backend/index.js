import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { FactorySimulator } from './simulator/simulator.js';
import { triggerEnergyLeak, triggerConveyorJam, triggerMaintenanceAlert, resolveScenario } from './simulator/scenarios.js';
import { StateCache } from './middleware/stateCache.js';
import { detectAnomalies, detectStateTransition, detectIdleEnergyWaste } from './middleware/anomalyDetector.js';
import { checkBreakerCorrelation } from './middleware/correlator.js';
import { initClient, pushEvent, searchMemories, seedFactoryKnowledge, isEnabled } from './middleware/supermemoryClient.js';

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;

// ─── Module-level State ───────────────────────────────────────────────────────
const simulator = new FactorySimulator();
const stateCache = new StateCache();

// Debounce maps (machineId → last event timestamp)
const idleWasteDebounce = new Map();
const anomalyDebounce = new Map();
let lastCorrelationTime = 0;

// Prevent duplicate one-time alerts
const maintenanceTriggered = new Set();

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', supermemory: isEnabled(), uptime: Math.round(process.uptime()) });
});

// Used by Next.js API route for agent queries (optional — UI can also call Supermemory directly)
app.post('/api/search', async (req, res) => {
  const { query, filters, limit } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const results = await searchMemories(query, { filters, limit });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Socket.io Events ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.io] UI connected: ${socket.id}`);

  // Scenario trigger from UI control panel
  socket.on('trigger_scenario', ({ scenario }) => {
    console.log(`[Socket.io] Scenario trigger: ${scenario}`);
    if (scenario === 'energy_leak') triggerEnergyLeak(simulator);
    else if (scenario === 'conveyor_jam') triggerConveyorJam(simulator);
    else if (scenario === 'maintenance') triggerMaintenanceAlert(simulator);
    // Broadcast scenario activation to all connected UIs
    io.emit('scenario_activated', { scenario, timestamp: new Date().toISOString() });
  });

  // Operator marks a fault as resolved
  socket.on('mark_resolved', async ({ machineId, faultType, notes }) => {
    const ts = new Date().toISOString();
    const content = `Resolution [${ts}]: ${machineId} ${faultType || 'fault'} cleared. ${notes || 'Corrective maintenance performed. Machine returned to PROCESSING state.'}`;

    const result = await pushEvent({
      content,
      eventType: 'resolution',
      machineId,
      severity: 'info',
      metadata: { fault_type: faultType, resolved_at: ts },
    });

    if (result) {
      io.emit('memory_event', { type: 'resolution', machineId, content, timestamp: ts, severity: 'info' });
    }

    resolveScenario(simulator, machineId);
    io.emit('scenario_cleared', { machineId, timestamp: ts });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] UI disconnected: ${socket.id}`);
  });
});

// ─── Machine Memory Layer: Telemetry Processing Pipeline ─────────────────────
simulator.on('telemetry', async (readings) => {
  // 1. Always broadcast raw telemetry to all UI clients
  io.emit('telemetry', readings);

  // 2. Process each machine through the memory layer
  for (const [machineId, reading] of Object.entries(readings)) {
    const { metrics, status, timestamp, cumulative_kwh } = reading;

    // Update sliding window cache, get previous status
    const prevStatus = stateCache.update(machineId, metrics, status);

    // Skip main_breaker for rule 1 & 2 — handled via correlation rule 3
    if (machineId === 'main_breaker') continue;

    // ── Rule 1: State Transition ───────────────────────────────────────────
    const transition = detectStateTransition(machineId, status, prevStatus);
    if (transition && transition.from !== null) {
      const content = `Factory Event: Machine ${machineId} transitioned from ${transition.from} to ${transition.to}. Core operating load stabilized at ${metrics.power_kw}kW.`;
      const r = await pushEvent({
        content, eventType: 'state_shift', machineId, severity: 'info',
        metadata: { from_status: transition.from, to_status: transition.to, power_kw: metrics.power_kw },
      });
      if (r) io.emit('memory_event', { type: 'state_shift', machineId, content, timestamp, severity: 'info' });
    }

    // ── Rule 2: Anomaly Detection (>3σ) ────────────────────────────────────
    const anomalies = detectAnomalies(machineId, metrics, stateCache);
    const debounceKey = `anomaly_${machineId}`;
    const lastAnomaly = anomalyDebounce.get(debounceKey) || 0;
    const now = Date.now();

    if (anomalies.length > 0 && now - lastAnomaly > 12000) {
      anomalyDebounce.set(debounceKey, now);

      const p = anomalies[0]; // primary (highest sigma)
      const extras = anomalies.slice(1).map(a => `${a.label}: ${a.value}${a.unit}`).join(', ');
      const content = `Factory Alert: Anomaly detected on ${machineId}. ${p.label} ${p.direction === 'spike' ? 'spiked to' : 'dropped to'} ${p.value}${p.unit} (Baseline: ${p.baseline}${p.unit}, ${p.sigmas}σ deviation)${extras ? `. Also observed: ${extras}` : ''}. Machine status: ${status}.`;
      const severity = status === 'CRITICAL' ? 'critical' : 'warning';

      const r = await pushEvent({
        content, eventType: 'anomaly', machineId, severity,
        metadata: { primary_metric: p.metric, primary_value: p.value, primary_baseline: p.baseline, sigmas: p.sigmas, power_kw: metrics.power_kw },
      });
      if (r) {
        io.emit('memory_event', { type: 'anomaly', machineId, content, timestamp, severity });

        // ── Rule 3: Cross-Asset Correlation (debounce 15s globally) ────────
        if (now - lastCorrelationTime > 15000) {
          const bStats = stateCache.getStats('main_breaker', 'power_kw');
          const bPower = readings['main_breaker']?.metrics.power_kw;
          const corr = checkBreakerCorrelation(bPower, bStats);

          if (corr) {
            lastCorrelationTime = now;
            const corrContent = `System Event: Main Breaker registered macro energy surge reaching ${corr.breakerPower}kW (${corr.surgePercent}% above normal baseline of ${corr.baseline}kW). This power draw directly correlates with the ${p.label.toLowerCase()} anomaly logged on ${machineId}.`;
            const cr = await pushEvent({
              content: corrContent, eventType: 'correlation', machineId: 'main_breaker', severity: 'critical',
              metadata: { correlated_machine: machineId, breaker_power: corr.breakerPower, surge_percent: corr.surgePercent },
            });
            if (cr) io.emit('memory_event', { type: 'correlation', machineId: 'main_breaker', content: corrContent, timestamp, severity: 'critical' });
          }
        }
      }
    }

    // ── Special Rule: Idle Energy Waste — Scenario A signature (debounce 30s) ──
    if (detectIdleEnergyWaste(machineId, metrics, status)) {
      const lastWaste = idleWasteDebounce.get(machineId) || 0;
      if (now - lastWaste > 30000) {
        idleWasteDebounce.set(machineId, now);
        const content = `Operational Defect: ${machineId} has completed its operational batch but remains active in an unproductive IDLE state, consuming ${metrics.power_kw}kW/hr continuously. Total energy consumed in idle mode: ${cumulative_kwh} kWh.`;
        const r = await pushEvent({
          content, eventType: 'idle_waste', machineId, severity: 'warning',
          metadata: { power_kw: metrics.power_kw, cumulative_kwh },
        });
        if (r) io.emit('memory_event', { type: 'idle_waste', machineId, content, timestamp, severity: 'warning' });
      }
    }

    // ── Special Rule: Maintenance Threshold — Scenario C (mixer_02 only) ──
    if (machineId === 'mixer_02' && !maintenanceTriggered.has('mixer_02') && cumulative_kwh >= 5000) {
      maintenanceTriggered.add('mixer_02');
      const content = `Maintenance Notice: mixer_02 (Main Heavy Mixer) has surpassed its 5,000 kWh aggregate operational runtime threshold (current: ${cumulative_kwh} kWh). Schedule immediate bearing inspection and lubrication service to prevent mechanical failure.`;
      const r = await pushEvent({
        content, eventType: 'maintenance', machineId: 'mixer_02', severity: 'warning',
        metadata: { cumulative_kwh, threshold_kwh: 5000 },
      });
      if (r) io.emit('memory_event', { type: 'maintenance', machineId: 'mixer_02', content, timestamp, severity: 'warning' });
    }
  }
});

// ─── Boot Sequence ────────────────────────────────────────────────────────────
async function start() {
  console.log('\n🏭  MachineMemory.io — Cyber-Physical Memory Layer');
  console.log('━'.repeat(52));

  // Init Supermemory client
  initClient();

  // Seed factory knowledge (ontology + historical faults)
  if (isEnabled()) {
    try {
      await seedFactoryKnowledge();
    } catch (err) {
      console.error('[Boot] Supermemory seeding failed (continuing):', err.message);
    }
  }

  // Start factory simulator
  simulator.start();

  // Start HTTP + Socket.io server
  httpServer.listen(PORT, () => {
    console.log(`\n✅  Backend    → http://localhost:${PORT}`);
    console.log(`🧠  Supermemory → ${process.env.SM_BASE_URL || 'http://localhost:6767'} [${isEnabled() ? 'ENABLED' : 'DISABLED — set SM_API_KEY'}]`);
    console.log(`📡  Socket.io   → Ready for UI connections\n`);
  });
}

start().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
