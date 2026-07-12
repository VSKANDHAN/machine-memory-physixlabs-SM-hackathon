'use client';

interface MachineStatus {
  status: 'IDLE' | 'PROCESSING' | 'CRITICAL';
  power_kw: number;
}

interface Props {
  statuses: Record<string, MachineStatus>;
}

const STATUS_COLOR = {
  PROCESSING: { fill: '#064e3b', stroke: '#10b981', text: '#6ee7b7' },
  IDLE:       { fill: '#422006', stroke: '#d97706', text: '#fcd34d' },
  CRITICAL:   { fill: '#450a0a', stroke: '#ef4444', text: '#fca5a5' },
};

function MachineBox({
  id, label, x, y, w = 100, h = 60, status = 'PROCESSING', power
}: {
  id: string; label: string; x: number; y: number; w?: number; h?: number;
  status?: keyof typeof STATUS_COLOR; power?: number;
}) {
  const c = STATUS_COLOR[status];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
      {/* Pulsing ring for CRITICAL */}
      {status === 'CRITICAL' && (
        <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={8} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.4}>
          <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
        </rect>
      )}
      <text x={x + w / 2} y={y + h / 2 - 8} textAnchor="middle" fill={c.text} fontSize={9} fontWeight="bold" fontFamily="monospace" letterSpacing="0.05em">
        {id.toUpperCase()}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fill="#9ca3af" fontSize={8} fontFamily="sans-serif">
        {label}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 16} textAnchor="middle" fill={c.text} fontSize={9} fontFamily="monospace">
        {power !== undefined ? `${power.toFixed(1)} kW` : ''}
      </text>
      {/* Status dot */}
      <circle cx={x + w - 8} cy={y + 8} r={3} fill={c.stroke}>
        {status === 'CRITICAL' && (
          <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
        )}
      </circle>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth={1.5} markerEnd="url(#arrow)" />
  );
}

export default function FactoryLayout({ statuses }: Props) {
  function get(id: string): MachineStatus {
    return statuses[id] ?? { status: 'PROCESSING', power_kw: 0 };
  }

  const feeder   = get('feeder_01');
  const mixer    = get('mixer_02');
  const conveyor = get('conveyor_03');
  const packager = get('packaging_04');
  const breaker  = get('main_breaker');

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-200">Factory Floor — Live View</span>
        <div className="flex items-center gap-3 text-[10px]">
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1" style={{ color: c.text }}>
              <span style={{ background: c.stroke }} className="w-1.5 h-1.5 rounded-full inline-block" />
              {s}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 620 180" className="w-full" style={{ maxHeight: 180 }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#374151" />
          </marker>
        </defs>

        {/* Process flow: Feeder → Mixer → Conveyor → Packaging */}
        <MachineBox id="feeder_01"    label="Raw Feeder"   x={10}  y={60} w={100} h={60} status={feeder.status as keyof typeof STATUS_COLOR}   power={feeder.power_kw} />
        <Arrow x1={112} y1={90} x2={128} y2={90} />
        <MachineBox id="mixer_02"     label="Heavy Mixer"  x={130} y={60} w={110} h={60} status={mixer.status as keyof typeof STATUS_COLOR}    power={mixer.power_kw} />
        <Arrow x1={242} y1={90} x2={258} y2={90} />
        <MachineBox id="conveyor_03"  label="Conveyor"     x={260} y={60} w={110} h={60} status={conveyor.status as keyof typeof STATUS_COLOR} power={conveyor.power_kw} />
        <Arrow x1={372} y1={90} x2={388} y2={90} />
        <MachineBox id="packaging_04" label="Packaging"    x={390} y={60} w={110} h={60} status={packager.status as keyof typeof STATUS_COLOR} power={packager.power_kw} />

        {/* Main Breaker — separate energy monitor panel */}
        <line x1={510} y1={90} x2={540} y2={90} stroke="#374151" strokeWidth={1} strokeDasharray="4 3" />
        <MachineBox id="main_breaker" label="Main Breaker"  x={542} y={52} w={70} h={76} status={breaker.status as keyof typeof STATUS_COLOR} power={breaker.power_kw} />

        {/* Labels */}
        <text x={310} y={155} textAnchor="middle" fill="#4b5563" fontSize={8} fontFamily="sans-serif">
          ◄─────────────── Process Flow Direction ───────────────►
        </text>
        <text x={577} y={144} textAnchor="middle" fill="#4b5563" fontSize={7} fontFamily="sans-serif">
          Energy
        </text>
        <text x={577} y={152} textAnchor="middle" fill="#4b5563" fontSize={7} fontFamily="sans-serif">
          Monitor
        </text>
      </svg>
    </div>
  );
}
