import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { chartWindowForRange, formatChartTime } from '../lib/stats';

export interface ChartPoint {
  x: string;
  y: number;
}

type ChartSyncValue = {
  hoverMs: number | null;
  setHoverMs: (ms: number | null) => void;
};

const ChartSyncContext = createContext<ChartSyncValue | null>(null);

/** Sync crosshair time across sibling UsageCharts. */
export function ChartSyncProvider({ children }: { children: ReactNode }) {
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const value = useMemo(() => ({ hoverMs, setHoverMs }), [hoverMs]);
  return <ChartSyncContext.Provider value={value}>{children}</ChartSyncContext.Provider>;
}

interface UsageChartProps {
  title: string;
  unit: string;
  color: string;
  range: string;
  data: ChartPoint[];
  max?: number;
  /** Draw a soft band from this value to yMax (e.g. warn zone). */
  warnFrom?: number;
  valueUnit?: 'percent' | 'bytes' | 'rate' | 'raw';
  formatValue?: (value: number) => string;
  className?: string;
  /** Participate in ChartSyncProvider crosshair. */
  sync?: boolean;
}

export function UsageChart({
  title,
  unit,
  color,
  range,
  data,
  max,
  warnFrom,
  valueUnit = 'raw',
  formatValue,
  className = '',
  sync = false,
}: UsageChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const bandId = useId().replace(/:/g, '');
  const [localHover, setLocalHover] = useState<number | null>(null);
  const syncCtx = useContext(ChartSyncContext);

  const width = 640;
  const height = 188;
  const pad = { top: 14, right: 14, bottom: 30, left: 46 };
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

  const resolveHoverIndex = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (!layout) return null;
      const svgX = ((clientX - rect.left) / rect.width) * width;
      let closest = 0;
      let minDist = Infinity;
      layout.points.forEach((p, i) => {
        const dist = Math.abs(p.x - svgX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      return closest;
    },
    [layout],
  );

  const hoverIndex = useMemo(() => {
    if (!layout) return null;
    if (sync && syncCtx?.hoverMs != null) {
      let closest = 0;
      let minDist = Infinity;
      layout.points.forEach((p, i) => {
        const dist = Math.abs(p.t - syncCtx.hoverMs!);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      return closest;
    }
    return localHover;
  }, [layout, localHover, sync, syncCtx?.hoverMs]);

  if (!layout || data.length === 0) {
    return (
      <div className={`ds-chart${className ? ` ${className}` : ''}`}>
        <div className="ds-chart-head">
          <div>
            <p className="ds-chart-title">{title}</p>
            <p className="ds-chart-unit">{unit}</p>
          </div>
        </div>
        <div className="ds-chart-empty">
          <span>No samples in this window</span>
          <span>Snapshots appear while the server runs or the console is open.</span>
        </div>
      </div>
    );
  }

  const { points, linePath, areaPath, yTicks, xTicks, yMax, latest, avg, peak } = layout;
  const hover = hoverIndex !== null ? points[hoverIndex] : null;
  const headerValue = hover ? hover.value : latest;
  const warnY =
    warnFrom != null && warnFrom > 0 && warnFrom < yMax
      ? pad.top + innerH - (warnFrom / yMax) * innerH
      : null;

  return (
    <div className={`ds-chart${className ? ` ${className}` : ''}`}>
      <div className="ds-chart-head">
        <div className="min-w-0">
          <p className="ds-chart-title">{title}</p>
          <p className="ds-chart-unit">{unit}</p>
        </div>
        <p className="ds-chart-live" style={{ color }}>
          {fmt(headerValue)}
        </p>
      </div>

      <div className="ds-chart-stats">
        <span>
          Avg <strong>{fmt(avg)}</strong>
        </span>
        <span>
          Peak <strong>{fmt(peak)}</strong>
        </span>
        {max !== undefined ? (
          <span>
            Cap <strong>{fmt(max)}</strong>
          </span>
        ) : null}
      </div>

      <div className="ds-chart-plot">
        {hover ? (
          <div
            className="ds-chart-tooltip"
            style={{ left: `${(hover.x / width) * 100}%` }}
          >
            <p className="ds-chart-tooltip-value">{fmt(hover.value)}</p>
            <p className="ds-chart-tooltip-time">{formatChartTime(hover.label, range)}</p>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="ds-chart-svg"
          preserveAspectRatio="none"
          onMouseLeave={() => {
            setLocalHover(null);
            if (sync) syncCtx?.setHoverMs(null);
          }}
          onMouseMove={(e) => {
            const idx = resolveHoverIndex(e.clientX, e.currentTarget.getBoundingClientRect());
            if (idx == null) return;
            setLocalHover(idx);
            if (sync && layout.points[idx]) syncCtx?.setHoverMs(layout.points[idx].t);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="55%" stopColor={color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
            {warnY != null ? (
              <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.16" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            ) : null}
          </defs>

          {warnY != null ? (
            <rect
              x={pad.left}
              y={pad.top}
              width={innerW}
              height={Math.max(0, warnY - pad.top)}
              fill={`url(#${bandId})`}
            />
          ) : null}

          {yTicks.map((tick) => (
            <g key={tick.pct}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity="0.5"
              />
              <text x={pad.left - 6} y={tick.y + 3} textAnchor="end" fill="var(--muted)" fontSize="9">
                {fmt(tick.value)}
              </text>
            </g>
          ))}

          {max !== undefined && max <= yMax ? (
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={pad.top + innerH - (max / yMax) * innerH}
              y2={pad.top + innerH - (max / yMax) * innerH}
              stroke={color}
              strokeWidth="1.25"
              strokeDasharray="5 4"
              opacity="0.55"
            />
          ) : null}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.35"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {hover ? (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={pad.top}
                y2={pad.top + innerH}
                stroke={color}
                strokeWidth="1.25"
                opacity="0.4"
              />
              <circle cx={hover.x} cy={hover.y} r="4.5" fill="var(--surface)" stroke={color} strokeWidth="2" />
            </>
          ) : null}

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
