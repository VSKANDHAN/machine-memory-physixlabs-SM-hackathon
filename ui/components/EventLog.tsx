'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface MemoryEvent {
  id: string;
  type: 'state_shift' | 'anomaly' | 'correlation' | 'idle_waste' | 'maintenance' | 'resolution';
  machineId: string;
  content: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

const TYPE_STYLES: Record<string, { label: string; color: string; dot: string }> = {
  anomaly:     { label: 'ANOMALY',     color: 'text-orange-400 border-orange-800 bg-orange-950/40', dot: 'bg-orange-400' },
  correlation: { label: 'CORRELATION', color: 'text-red-400 border-red-800 bg-red-950/40',         dot: 'bg-red-500' },
  idle_waste:  { label: 'WASTE',       color: 'text-yellow-400 border-yellow-800 bg-yellow-950/40', dot: 'bg-yellow-400' },
  maintenance: { label: 'MAINTENANCE', color: 'text-purple-400 border-purple-800 bg-purple-950/40', dot: 'bg-purple-400' },
  state_shift: { label: 'STATE',       color: 'text-blue-400 border-blue-800 bg-blue-950/40',       dot: 'bg-blue-400' },
  resolution:  { label: 'RESOLVED',   color: 'text-green-400 border-green-800 bg-green-950/40',    dot: 'bg-green-400' },
};

export default function EventLog() {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    const handler = (evt: Omit<MemoryEvent, 'id'>) => {
      setEvents(prev => [
        { ...evt, id: `${Date.now()}-${Math.random()}` },
        ...prev,
      ].slice(0, 50)); // keep last 50
    };
    socket.on('memory_event', handler);
    return () => { socket.off('memory_event', handler); };
  }, []);

  return (
    <div className="flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 max-h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-gray-200">Supermemory Event Log</span>
        </div>
        <span className="text-xs text-gray-500">{events.length} memories stored</span>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {events.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">
            <div className="text-2xl mb-2">🧠</div>
            Waiting for factory events...
            <div className="text-xs mt-1">Significant anomalies will be stored here</div>
          </div>
        ) : (
          events.map((evt) => {
            const style = TYPE_STYLES[evt.type] || TYPE_STYLES.state_shift;
            return (
              <div
                key={evt.id}
                className={`rounded-lg border p-2.5 ${style.color} text-xs animate-in fade-in slide-in-from-top-2 duration-300`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${style.dot} flex-shrink-0`} />
                  <span className="font-bold tracking-wider">{style.label}</span>
                  <span className="text-gray-500 font-mono ml-auto flex-shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed pl-3.5">{evt.content}</p>
                <div className="flex items-center gap-1 mt-1.5 pl-3.5">
                  <span className="text-emerald-500 text-[10px]">✓ Stored in Supermemory</span>
                  <span className="text-gray-600 text-[10px]">· {evt.machineId}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
