'use client';

interface MachineReading {
  machine_id: string;
  machine_name: string;
  metrics: { power_kw: number; temperature_c: number; vibration_g: number; cycle_count: number };
  status: 'IDLE' | 'PROCESSING' | 'CRITICAL';
  cumulative_kwh: number;
}

const STATUS_STYLES = {
  IDLE:       'bg-yellow-500/20 text-yellow-400 border-yellow-600/50',
  PROCESSING: 'bg-emerald-500/20 text-emerald-400 border-emerald-600/50',
  CRITICAL:   'bg-red-500/20 text-red-400 border-red-600/50 animate-pulse',
};

const STATUS_DOT = {
  IDLE:       'bg-yellow-400',
  PROCESSING: 'bg-emerald-400',
  CRITICAL:   'bg-red-500',
};

const MACHINE_BASELINES: Record<string, Record<string, number>> = {
  feeder_01:    { power_kw: 5,  temperature_c: 35, vibration_g: 0.8 },
  mixer_02:     { power_kw: 45, temperature_c: 65, vibration_g: 2.1 },
  conveyor_03:  { power_kw: 12, temperature_c: 40, vibration_g: 1.2 },
  packaging_04: { power_kw: 8,  temperature_c: 45, vibration_g: 1.5 },
  main_breaker: { power_kw: 80, temperature_c: 35, vibration_g: 0.1 },
};

function isAnomalous(machineId: string, metric: string, value: number): boolean {
  const baseline = MACHINE_BASELINES[machineId]?.[metric];
  if (!baseline) return false;
  return Math.abs(value - baseline) / baseline > 0.25;
}

export default function MachineCard({ reading, isBreaker = false }: { reading: MachineReading; isBreaker?: boolean }) {
  const { machine_id, machine_name, metrics, status, cumulative_kwh } = reading;
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.IDLE;

  return (
    <div className={`rounded-xl border p-3 transition-all duration-500 ${
      status === 'CRITICAL'
        ? 'border-red-700 bg-red-950/20'
        : 'border-gray-800 bg-gray-900/50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="text-xs text-gray-500 font-mono uppercase tracking-wider">{machine_id}</div>
          <div className="text-sm font-semibold text-gray-200 mt-0.5 leading-tight">{machine_name}</div>
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {status}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1.5">
        <Metric
          label="Power"
          value={metrics.power_kw}
          unit="kW"
          warn={isAnomalous(machine_id, 'power_kw', metrics.power_kw)}
        />
        <Metric
          label="Temp"
          value={metrics.temperature_c}
          unit="°C"
          warn={isAnomalous(machine_id, 'temperature_c', metrics.temperature_c)}
        />
        <Metric
          label="Vibration"
          value={metrics.vibration_g}
          unit="g"
          warn={isAnomalous(machine_id, 'vibration_g', metrics.vibration_g)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/60">
        {isBreaker ? (
          <span className="text-[10px] text-gray-500">Total load incl. overhead</span>
        ) : (
          <span className="text-[10px] text-gray-500">
            Cycles: <span className="text-gray-300">{metrics.cycle_count}</span>
          </span>
        )}
        <span className="text-[10px] text-gray-600 font-mono">{cumulative_kwh} kWh</span>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, warn }: { label: string; value: number; unit: string; warn: boolean }) {
  return (
    <div className={`rounded-lg p-1.5 text-center ${warn ? 'bg-red-950/40' : 'bg-gray-800/40'}`}>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold font-mono mt-0.5 ${warn ? 'text-red-400' : 'text-gray-100'}`}>
        {value.toFixed(1)}
      </div>
      <div className="text-[9px] text-gray-500">{unit}</div>
    </div>
  );
}
