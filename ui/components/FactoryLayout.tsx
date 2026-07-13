'use client';

import type { ReactNode } from 'react';

interface MachineStatus {
  status: 'IDLE' | 'PROCESSING' | 'CRITICAL';
  power_kw: number;
}

interface Props {
  statuses: Record<string, MachineStatus>;
}

const C = {
  PROCESSING: { fill: '#022c22', stroke: '#10b981', text: '#6ee7b7', dim: '#064e3b' },
  IDLE:       { fill: '#1c1205', stroke: '#d97706', text: '#fcd34d', dim: '#422006' },
  CRITICAL:   { fill: '#1a0505', stroke: '#ef4444', text: '#fca5a5', dim: '#450a0a' },
} as const;

type Status = keyof typeof C;

// ─── Animated process pipe ────────────────────────────────────────
function FlowPipe({ x1, x2, y, status }: { x1: number; x2: number; y: number; status: Status }) {
  const active = status !== 'IDLE';
  const color  = status === 'CRITICAL' ? '#ef4444' : '#10b981';
  const len    = x2 - x1;
  const dur    = status === 'CRITICAL' ? '0.7s' : '1.1s';
  const durN   = parseFloat(dur);
  return (
    <g>
      <rect x={x1} y={y - 5} width={len} height={10} rx={5} fill="#090e1a" stroke="#1e293b" strokeWidth={1.2} />
      <rect x={x1 + 2} y={y - 3} width={len - 4} height={6} rx={3} fill="#050a14" />
      {active && [0, 1, 2].map((i) => (
        <circle key={i} cy={y} r={2.5} fill={color} opacity={0.9}>
          <animate attributeName="cx" from={x1 + 5} to={x2 - 5}
            dur={dur} begin={`${-(i / 3) * durN}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.9;0.9;0"
            keyTimes="0;0.15;0.85;1" dur={dur} begin={`${-(i / 3) * durN}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

// ─── Feeder hopper with dropping material ─────────────────────────
function FeederAnim({ cx, cy, status }: { cx: number; cy: number; status: Status }) {
  const color  = C[status].stroke;
  const active = status !== 'IDLE';
  return (
    <g>
      <polygon
        points={`${cx - 19},${cy - 21} ${cx + 19},${cy - 21} ${cx + 11},${cy + 6} ${cx - 11},${cy + 6}`}
        fill={C[status].dim} stroke={color} strokeWidth={1.2}
      />
      <rect x={cx - 6} y={cy + 6} width={12} height={13} rx={2} fill={C[status].dim} stroke={color} strokeWidth={1} />
      {active && [-7, 0, 7].map((dx, i) => (
        <circle key={i} cx={cx + dx} cy={cy - 10} r={2} fill={color} opacity={0.8}>
          <animate attributeName="cy" from={cy - 14} to={cy + 5}
            dur={`${0.65 + i * 0.17}s`} begin={`${i * 0.22}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.1;0"
            dur={`${0.65 + i * 0.17}s`} begin={`${i * 0.22}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

// ─── Mixer with rotating 4-blade impeller ─────────────────────────
function MixerAnim({ cx, cy, status }: { cx: number; cy: number; status: Status }) {
  const color = C[status].stroke;
  const dur   = status === 'CRITICAL' ? '0.5s' : status === 'PROCESSING' ? '1.8s' : '9s';
  return (
    <g>
      <circle cx={cx} cy={cy} r={23} fill={C[status].dim} stroke={color} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={23} fill="none" stroke={color} strokeWidth={0.5}
              strokeDasharray="4 6" opacity={0.3} />
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={dur} repeatCount="indefinite" />
        {[0, 90, 180, 270].map((angle) => (
          <rect key={angle} x={cx - 2.5} y={cy - 20} width={5} height={13} rx={2.5}
            fill={color} opacity={0.85} transform={`rotate(${angle} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={4.5} fill={C[status].dim} stroke={color} strokeWidth={1.5} />
      </g>
    </g>
  );
}

// ─── Conveyor belt with moving items ─────────────────────────────
function ConveyorAnim({ x, cy, w, status }: { x: number; cy: number; w: number; status: Status }) {
  const color  = C[status].stroke;
  const active = status !== 'IDLE';
  const dur    = status === 'CRITICAL' ? '0.6s' : '1.4s';
  const durN   = parseFloat(dur);
  const itemW  = 13;
  return (
    <g>
      <rect x={x} y={cy - 7} width={w} height={14} rx={7} fill={C[status].dim} stroke={color} strokeWidth={1} />
      <circle cx={x + 7} cy={cy} r={7} fill="#090e1a" stroke={color} strokeWidth={1} />
      <circle cx={x + w - 7} cy={cy} r={7} fill="#090e1a" stroke={color} strokeWidth={1} />
      <rect x={x + 8} y={cy - 4} width={w - 16} height={8} fill="#090e1a" />
      {active && [0, 1, 2, 3].map((i) => (
        <rect key={i} y={cy - 4} width={itemW} height={7} rx={1.5} fill={color} opacity={0.55}>
          <animate attributeName="x" from={x + 9} to={x + w - itemW - 9}
            dur={dur} begin={`${-(i / 4) * durN}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.55;0.55;0"
            keyTimes="0;0.1;0.9;1" dur={dur} begin={`${-(i / 4) * durN}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  );
}

// ─── Packaging press with exiting boxes ──────────────────────────
function PackagerAnim({ cx, cy, status }: { cx: number; cy: number; status: Status }) {
  const color  = C[status].stroke;
  const active = status !== 'IDLE';
  const dur    = status === 'CRITICAL' ? '0.75s' : '1.8s';
  const durN   = parseFloat(dur);
  return (
    <g>
      <rect x={cx - 22} y={cy - 26} width={44} height={34} rx={4}
            fill={C[status].dim} stroke={color} strokeWidth={1.2} />
      <rect x={cx - 17} y={cy - 22} width={7} height={16} rx={2.5} fill={color} opacity={0.8}>
        {active && <animate attributeName="height" values="16;8;16" dur={dur} repeatCount="indefinite" />}
      </rect>
      <rect x={cx + 10} y={cy - 22} width={7} height={16} rx={2.5} fill={color} opacity={0.8}>
        {active && <animate attributeName="height" values="16;8;16" dur={dur} begin={`${durN / 2}s`} repeatCount="indefinite" />}
      </rect>
      {active && [0, 1].map((i) => (
        <rect key={i} y={cy + 8} height={11} width={11} rx={1.5} fill={color} opacity={0.7}>
          <animate attributeName="x" from={cx - 6} to={cx + 36}
            dur={`${durN * 1.8}s`} begin={`${-i * durN * 0.9}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.7;0.7;0"
            keyTimes="0;0.15;0.8;1" dur={`${durN * 1.8}s`} begin={`${-i * durN * 0.9}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  );
}

// ─── Machine housing panel ────────────────────────────────────────
function MachinePanel({
  id, label, icon, x, y, w = 120, h = 105, status = 'PROCESSING', power,
}: {
  id: string; label: string; icon: ReactNode;
  x: number; y: number; w?: number; h?: number;
  status?: Status; power?: number;
}) {
  const c = C[status];
  return (
    <g>
      {status === 'CRITICAL' && (
        <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={11}
              fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.3}>
          <animate attributeName="opacity" values="0.3;0;0.3" dur="0.9s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={x} y={y} width={w} height={h} rx={7} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={16} rx={6} fill={c.dim} />
      <rect x={x + 1} y={y + 9} width={w - 2} height={8} fill={c.dim} />
      <text x={x + 7} y={y + 12} fill={c.text} fontSize={7.5} fontWeight="bold"
            fontFamily="monospace" letterSpacing="0.1em">
        {id.toUpperCase()}
      </text>
      <circle cx={x + w - 10} cy={y + 9} r={3.5} fill={c.stroke}>
        {status === 'CRITICAL' && (
          <animate attributeName="r" values="3.5;5.5;3.5" dur="0.7s" repeatCount="indefinite" />
        )}
        {status === 'PROCESSING' && (
          <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
        )}
      </circle>
      {icon}
      <text x={x + w / 2} y={y + h - 18} textAnchor="middle"
            fill="#6b7280" fontSize={7.5} fontFamily="sans-serif">
        {label}
      </text>
      <text x={x + w / 2} y={y + h - 6} textAnchor="middle"
            fill={c.text} fontSize={9} fontFamily="monospace" fontWeight="bold">
        {power !== undefined ? `${power.toFixed(1)} kW` : '—'}
      </text>
    </g>
  );
}

// ─── Main SCADA export ───────────────────────────────────────────
export default function FactoryLayout({ statuses }: Props) {
  function get(id: string): MachineStatus {
    return statuses[id] ?? { status: 'PROCESSING', power_kw: 0 };
  }

  const feeder   = get('feeder_01');
  const mixer    = get('mixer_02');
  const conveyor = get('conveyor_03');
  const packager = get('packaging_04');
  const breaker  = get('main_breaker');

  const fS = feeder.status   as Status;
  const mS = mixer.status    as Status;
  const cS = conveyor.status as Status;
  const pS = packager.status as Status;
  const bS = breaker.status  as Status;

  // Layout constants
  const mY   = 78;   // machine panel top y
  const mH   = 105;  // machine panel height
  const midY = mY + Math.round(mH / 2); // 130 — pipe & icon vertical centre

  // Machine x positions and widths
  // Feeder:8→128  |pipe:30|  Mixer:158→298  |pipe:30|  Conveyor:328→453  |pipe:30|  Packager:483→603
  const M = [
    { x: 8,   w: 120 }, // feeder_01
    { x: 158, w: 140 }, // mixer_02 (wider to give the gear room)
    { x: 328, w: 125 }, // conveyor_03
    { x: 483, w: 120 }, // packaging_04
  ];

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-200 tracking-wide">
          Factory Floor — SCADA View
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          {(Object.keys(C) as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-1" style={{ color: C[s].text }}>
              <span style={{ background: C[s].stroke }} className="w-1.5 h-1.5 rounded-full inline-block" />
              {s}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 660 225" className="w-full" style={{ maxHeight: 225 }}>
        <defs>
          <pattern id="dot-grid" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="0.65" fill="#0f2042" />
          </pattern>
        </defs>

        {/* ── Backgrounds ── */}
        <rect width="660" height="225" fill="#060c17" />
        <rect width="660" height="225" fill="url(#dot-grid)" />

        {/* SCADA scan-line sweep */}
        <rect x={0} y={0} width={660} height={4} fill="#10b981" opacity={0.05}>
          <animate attributeName="y" from="0" to="225" dur="5s" repeatCount="indefinite" />
        </rect>

        {/* ── Header band ── */}
        <rect x={0} y={0} width={660} height={22} fill="#07101f" opacity={0.95} />
        <text x={8} y={14} fill="#10b981" fontSize={7} fontFamily="monospace"
              letterSpacing="0.18em" fontWeight="bold">
          PHYSIX LABS ▸ PROCESS CONTROL  [ LIVE ]
        </text>
        <text x={652} y={14} fill="#1e3a5f" fontSize={6.5} fontFamily="monospace" textAnchor="end">
          IIoT v2.1
        </text>

        {/* ── Main Breaker panel ── */}
        <rect x={597} y={24} width={59} height={50} rx={5} fill="#0c1424"
              stroke={C[bS].stroke} strokeWidth={1.5} />
        <text x={626} y={35} textAnchor="middle" fill={C[bS].text}
              fontSize={5.5} fontFamily="monospace" letterSpacing="0.1em" fontWeight="bold">
          MAIN BKR
        </text>
        <text x={626} y={52} textAnchor="middle" fill={C[bS].stroke} fontSize={15}>⚡</text>
        <text x={626} y={67} textAnchor="middle" fill={C[bS].text} fontSize={7} fontFamily="monospace">
          {breaker.power_kw.toFixed(1)} kW
        </text>

        {/* ── Power distribution bus (y=42) ── */}
        <line x1={597} y1={42} x2={8} y2={42}
              stroke="#1e3a5f" strokeWidth={2.5} strokeDasharray="6 3" />
        {M.map(({ x, w }, i) => (
          <line key={i} x1={x + w / 2} y1={42} x2={x + w / 2} y2={mY}
                stroke="#1e3a5f" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
        ))}
        {/* Power flow pulses along bus */}
        {[0, 1, 2].map((i) => (
          <circle key={i} cy={42} r={2.5} fill="#3b82f6" opacity={0.7}>
            <animate attributeName="cx" from="595" to="12"
              dur="3s" begin={`${-(i / 3) * 3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.7;0.7;0"
              keyTimes="0;0.08;0.92;1" dur="3s" begin={`${-(i / 3) * 3}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* ── Process flow pipes ── */}
        <FlowPipe x1={128} x2={158} y={midY} status={fS} />
        <FlowPipe x1={298} x2={328} y={midY} status={mS} />
        <FlowPipe x1={453} x2={483} y={midY} status={cS} />

        {/* ── Machine panels ── */}
        <MachinePanel id="feeder_01" label="Raw Feeder"
          x={M[0].x} y={mY} w={M[0].w} h={mH} status={fS} power={feeder.power_kw}
          icon={<FeederAnim cx={M[0].x + M[0].w / 2} cy={midY} status={fS} />}
        />
        <MachinePanel id="mixer_02" label="Heavy Mixer"
          x={M[1].x} y={mY} w={M[1].w} h={mH} status={mS} power={mixer.power_kw}
          icon={<MixerAnim cx={M[1].x + M[1].w / 2} cy={midY} status={mS} />}
        />
        <MachinePanel id="conveyor_03" label="Belt Conveyor"
          x={M[2].x} y={mY} w={M[2].w} h={mH} status={cS} power={conveyor.power_kw}
          icon={<ConveyorAnim x={M[2].x + 12} cy={midY} w={M[2].w - 24} status={cS} />}
        />
        <MachinePanel id="packaging_04" label="Packaging"
          x={M[3].x} y={mY} w={M[3].w} h={mH} status={pS} power={packager.power_kw}
          icon={<PackagerAnim cx={M[3].x + M[3].w / 2} cy={midY} status={pS} />}
        />

        {/* ── Zone labels ── */}
        {([
          { label: 'INTAKE',    cx: M[0].x + M[0].w / 2 },
          { label: 'PROCESS',   cx: M[1].x + M[1].w / 2 },
          { label: 'TRANSPORT', cx: M[2].x + M[2].w / 2 },
          { label: 'OUTPUT',    cx: M[3].x + M[3].w / 2 },
        ] as { label: string; cx: number }[]).map(({ label, cx }) => (
          <text key={label} x={cx} y={mY + mH + 16} textAnchor="middle"
                fill="#1e3a5f" fontSize={6.5} fontFamily="monospace" letterSpacing="0.14em">
            {label}
          </text>
        ))}

        {/* ── Flow direction ── */}
        <text x={300} y={mY + mH + 29} textAnchor="middle"
              fill="#1e3a5f" fontSize={7} fontFamily="sans-serif">
          ◄─────────────── PROCESS FLOW DIRECTION ───────────────►
        </text>
      </svg>
    </div>
  );
}
