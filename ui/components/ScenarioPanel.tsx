'use client';

import { useState } from 'react';
import { getSocket } from '@/lib/socket';

interface ActiveScenario {
  scenario: string;
  machineId: string;
  label: string;
}

const SCENARIOS = [
  {
    id: 'energy_leak',
    machineId: 'feeder_01',
    label: 'Energy Leak',
    icon: '⚡',
    description: 'feeder_01 completes batch but stays IDLE drawing full 5kW — unproductive energy drain',
    color: 'border-yellow-700 hover:border-yellow-500 hover:bg-yellow-950/30',
    activeColor: 'border-yellow-500 bg-yellow-950/40',
    faultType: 'idle_waste',
  },
  {
    id: 'conveyor_jam',
    machineId: 'conveyor_03',
    label: 'Conveyor Jam',
    icon: '🔴',
    description: 'conveyor_03 mechanical jam: vibration 4.8g, power 30kW, temp 88°C — near-stall current',
    color: 'border-red-700 hover:border-red-500 hover:bg-red-950/30',
    activeColor: 'border-red-500 bg-red-950/40',
    faultType: 'mechanical_jam',
  },
  {
    id: 'maintenance',
    machineId: 'mixer_02',
    label: 'Maintenance Alert',
    icon: '🔧',
    description: 'mixer_02 crosses 5,000 kWh cumulative runtime — bearing inspection required',
    color: 'border-purple-700 hover:border-purple-500 hover:bg-purple-950/30',
    activeColor: 'border-purple-500 bg-purple-950/40',
    faultType: 'maintenance_threshold',
  },
];

export default function ScenarioPanel({ panelMode = false }: { panelMode?: boolean }) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  function trigger(scenarioId: string) {
    const socket = getSocket();
    socket.emit('trigger_scenario', { scenario: scenarioId });
    setActive(prev => new Set([...prev, scenarioId]));
  }

  function resolve(scenario: typeof SCENARIOS[0]) {
    const socket = getSocket();
    socket.emit('mark_resolved', {
      machineId: scenario.machineId,
      faultType: scenario.faultType,
      notes: resolveNotes[scenario.id] || undefined,
    });
    setActive(prev => {
      const next = new Set(prev);
      next.delete(scenario.id);
      return next;
    });
    setResolveNotes(prev => ({ ...prev, [scenario.id]: '' }));
  }

  const scenarioList = (
    <div className="space-y-3">
      {SCENARIOS.map(s => {
        const isActive = active.has(s.id);
        return (
          <div
            key={s.id}
            className={`rounded-lg border p-3 transition-all duration-200 ${isActive ? s.activeColor : s.color}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg mt-0.5">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-200">{s.label}</span>
                  <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">{s.machineId}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{s.description}</p>
                <div className="flex gap-2 mt-2">
                  {!isActive ? (
                    <button
                      onClick={() => trigger(s.id)}
                      className="text-xs px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium transition-colors"
                    >
                      Trigger Scenario
                    </button>
                  ) : (
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                        <span className="text-[10px] text-red-400 font-medium">SCENARIO ACTIVE</span>
                      </div>
                      <input
                        placeholder="Resolution notes (optional)…"
                        value={resolveNotes[s.id] || ''}
                        onChange={e => setResolveNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                        className="w-full text-[11px] bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => resolve(s)}
                        className="text-xs px-3 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors"
                      >
                        ✓ Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
        Each trigger injects a fault into the simulator. The Memory Layer detects the anomaly, formats a semantic string, and stores it in Supermemory — visible in the Event Log above.
      </p>
    </div>
  );

  if (panelMode) return scenarioList;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-gray-200">Failure Scenario Injector</span>
        <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full ml-auto">
          DEMO CONTROLS
        </span>
      </div>
      {scenarioList}
    </div>
  );
}