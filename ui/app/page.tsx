'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import FactoryLayout from '@/components/FactoryLayout';
import MachineCard from '@/components/MachineCard';
import EventLog from '@/components/EventLog';
import AgentChat from '@/components/AgentChat';
import ScenarioPanel from '@/components/ScenarioPanel';

interface MachineReading {
  machine_id: string;
  machine_name: string;
  metrics: { power_kw: number; temperature_c: number; vibration_g: number; cycle_count: number };
  status: 'IDLE' | 'PROCESSING' | 'CRITICAL';
  cumulative_kwh: number;
  timestamp: string;
}

const MACHINE_ORDER = ['feeder_01', 'mixer_02', 'conveyor_03', 'packaging_04'];

export default function ControlRoom() {
  const [readings, setReadings] = useState<Record<string, MachineReading>>({});
  const [connected, setConnected] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('telemetry', (data: Record<string, MachineReading>) => setReadings(data));
    if (socket.connected) setConnected(true);
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('telemetry');
    };
  }, []);

  const layoutStatuses = Object.fromEntries(
    Object.entries(readings).map(([id, r]) => [id, { status: r.status, power_kw: r.metrics.power_kw }])
  );
  const totalPower = readings['main_breaker']?.metrics.power_kw ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Sticky Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-gray-800 px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-900/30">M</div>
            <div>
              <h1 className="text-sm font-bold leading-none">MachineMemory</h1>
              <p className="text-[10px] text-gray-500 mt-0.5">Physical AI Memory Layer · Physix Labs</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Total Load */}
          <div className="text-right pr-4 mr-1 border-r border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Load</div>
            <div className={`text-xl font-bold font-mono tabular-nums ${totalPower > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalPower.toFixed(1)}<span className="text-xs font-normal text-gray-500 ml-1">kW</span>
            </div>
          </div>

          {/* Live badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
            connected ? 'border-emerald-700 bg-emerald-950/60 text-emerald-400' : 'border-red-700 bg-red-950/60 text-red-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'LIVE' : 'DISCONNECTED'}
          </div>

          {/* Demo Controls */}
          <button
            onClick={() => setDemoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-700 rounded-lg text-gray-300 hover:border-gray-500 hover:bg-gray-800/80 transition-all"
          >
            <span>⚙</span> Demo Controls
          </button>

          {/* CTA */}
          <button
            onClick={() => setAgentOpen(true)}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-violet-900/40 hover:shadow-violet-800/50 hover:scale-[1.03] active:scale-[0.98]"
          >
            🤖 Ask Plant Manager AI
          </button>
        </div>
      </header>

      {/* ── Floor Monitor ───────────────────────────────────────── */}
      <main className="p-4 space-y-3">
        <FactoryLayout statuses={layoutStatuses} />

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {MACHINE_ORDER.map(id => {
            const r = readings[id];
            if (!r) return (
              <div key={id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 flex items-center justify-center min-h-[120px]">
                <span className="text-gray-600 text-xs">{id} — connecting…</span>
              </div>
            );
            return <MachineCard key={id} reading={r} />;
          })}
        </div>

        {readings['main_breaker'] && <MachineCard reading={readings['main_breaker']} isBreaker />}

        <EventLog />
      </main>

      {/* ── Agent Chat Modal ────────────────────────────────────── */}
      {agentOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setAgentOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl h-[88vh] bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl shadow-violet-900/25 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setAgentOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              ✕
            </button>
            <AgentChat />
          </div>
        </div>
      )}

      {/* ── Demo Controls Slide Panel ────────────────────────────── */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setDemoOpen(false)} />
          <div className="w-[400px] h-full bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
              <div>
                <div className="text-sm font-semibold text-gray-100">Failure Scenario Injector</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Inject real-time faults — Memory Layer captures them automatically</div>
              </div>
              <button
                onClick={() => setDemoOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-200 text-sm transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ScenarioPanel panelMode />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
