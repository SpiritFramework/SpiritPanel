import { useId, useMemo, useState } from 'react';
import { chartWindowForRange, formatChartTime } from '../lib/stats';

export interface ChartPoint {
  x: string;
  y: number;
}

interface UsageChartProps {
  title: string;
  unit: string;
  color: string;
  range: string;
  data: ChartPoint[];
  max?: number;
  valueUnit?: 'percent' | 'bytes' | 'rate' | 'raw';
  formatValue?: (value: number) => string;
}

export function UsageChart({
  title,
  unit,
  color,
  range,
  data,
  max,
  valueUnit = 'raw',
  formatValue,
}: UsageChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 640;
  const height = 168;
  const pad = { top: 12, right: 12, bottom: 28, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const window = useMemo(() => chartWindowForRange(range), [range]);
  const fmt = formatValue ?? ((v: number) => (valueUnit === 'percent' ? `${v.toFixed(1)}%` : v.toFixed(1)));

  const layout = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map((d) => d.y);
    const yMax = max ?? Math.max(...values, 1) * 1.12;
    const yMin = 0;
    const span = Math.max(window.endMs - window.startMs, 1);

    const points = data.map((d) => {
      const t = new Date(d.x).getTime();
      const clamped = Math.min(window.endMs, Math.max(window.startMs, t));
      const x = pad.left + ((clamped - window.startMs) / span) * innerW;
      const y = pad.top + innerH - ((d.y - yMin) / (yMax - yMin)) * innerH;
      return { x, y, label: d.x, value: d.y, t: clamped };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`
        : '';

    const yTicks = [0, 0.5, 1].map((pct) => ({
      pct,
      y: pad.top + innerH * (1 - pct),
      value: yMin + (yMax - yMin) * pct,
    }));

    const tickCount = range === '7d' ? 4 : range === '24h' ? 5 : 4;
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const t = window.startMs + (span * i) / (tickCount - 1);
      const x = pad.left + ((t - window.startMs) / span) * innerW;
      return { x, label: new Date(t).toISOString() };
    });

    const latest = data[data.length - 1]?.y ?? 0;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const peak = Math.max(...values);

    return { points, linePath, areaPath, yTicks, xTicks, yMax, latest, avg, peak };
  }, [data, innerH, innerW, max, pad.left, pad.top, window.endMs, window.startMs, range]);

  if (!layout || data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-4">
        <ChartHeader title={title} unit={unit} />
        <div className="flex h-[168px] flex-col items-center justify-center gap-1 text-center text-xs text-[var(--muted)]">
          <span>No usage data for this period yet.</span>
          <span className="text-[10px] opacity-70">Open the console or refresh — snapshots build over time.</span>
        </div>
      </div>
    );
  }

  const { points, linePath, areaPath, yTicks, xTicks, yMax, latest, avg, peak } = layout;
  const hover = hoverIndex !== null ? points[hoverIndex] : null;
  const headerValue = hover ? hover.value : latest;

  function handlePointerMove(clientX: number, rect: DOMRect) {
    const svgX = ((clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-4">
      <ChartHeader title={title} unit={unit} value={fmt(headerValue)} />
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--muted)]">
        <span>
          Avg <strong className="font-mono text-[var(--text)]">{fmt(avg)}</strong>
        </span>
        <span>
          Peak <strong className="font-mono text-[var(--text)]">{fmt(peak)}</strong>
        </span>
        {max !== undefined && (
          <span>
            Limit <strong className="font-mono text-[var(--text)]">{fmt(max)}</strong>
          </span>
        )}
      </div>

      <div className="relative mt-2">
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] shadow-lg"
            style={{
              left: `${(hover.x / width) * 100}%`,
              top: 0,
              transform: 'translate(-50%, -110%)',
            }}
          >
            <p className="font-medium text-[var(--text)]">{fmt(hover.value)}</p>
            <p className="text-[var(--muted)]">{formatChartTime(hover.label, range)}</p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full touch-none"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.42" />
              <stop offset="55%" stopColor={color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick.pct}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity="0.55"
              />
              <text x={pad.left - 6} y={tick.y + 3} textAnchor="end" fill="var(--muted)" fontSize="9">
                {fmt(tick.value)}
              </text>
            </g>
          ))}

          {max !== undefined && max <= yMax && (
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={pad.top + innerH - (max / yMax) * innerH}
              y2={pad.top + innerH - (max / yMax) * innerH}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="6 4"
              opacity="0.45"
            />
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.25" vectorEffect="non-scaling-stroke" />

          {hover && (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={pad.top}
                y2={pad.top + innerH}
                stroke={color}
                strokeWidth="1"
                opacity="0.35"
              />
              <circle cx={hover.x} cy={hover.y} r="4" fill="var(--surface)" stroke={color} strokeWidth="2" />
            </>
          )}

          {xTicks.map((tick, i) => (
            <text key={i} x={tick.x} y={height - 6} textAnchor="middle" fill="var(--muted)" fontSize="9">
              {formatChartTime(tick.label, range)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function ChartHeader({ title, unit, value }: { title: string; unit: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[11px] text-[var(--muted)]">{unit}</p>
      </div>
      {value !== undefined && (
        <span className="font-mono text-sm font-semibold accent-text">{value}</span>
      )}
    </div>
  );
}

export function UsageMeter({
  label,
  value,
  limit,
  unit,
  limitLabel,
  color,
}: {
  label: string;
  value: number;
  limit: number;
  unit: string;
  limitLabel: string;
  color: string;
}) {
  const pct = limit > 0 ? Math.min(100, (value / limit) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        <span className="font-mono text-sm font-semibold">{unit}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]/80">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--muted)]">
        <span className="font-mono text-[var(--text)]">{pct.toFixed(1)}%</span>
        {' · '}
        {limitLabel}
      </p>
    </div>
  );
}
