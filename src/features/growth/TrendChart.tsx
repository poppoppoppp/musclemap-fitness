import type { GrowthTrendPoint } from '../../types/growth';

interface TrendChartProps {
  points: GrowthTrendPoint[];
  label: string;
  id: string;
  compact?: boolean;
}

export default function TrendChart({ points, label, id, compact = false }: TrendChartProps) {
  const width = 320;
  const height = compact ? 136 : 168;
  const inset = { top: 16, right: 8, bottom: 28, left: 8 };
  const values = points.map(({ value }) => value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const innerWidth = width - inset.left - inset.right;
  const innerHeight = height - inset.top - inset.bottom;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: inset.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth),
    y: inset.top + ((max - point.value) / spread) * innerHeight
  }));
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = coordinates.length > 0
    ? `M ${coordinates[0].x} ${height - inset.bottom} L ${coordinates.map(({ x, y }) => `${x} ${y}`).join(' L ')} L ${coordinates[coordinates.length - 1].x} ${height - inset.bottom} Z`
    : '';
  const visibleLabels = coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || (!compact && index === Math.floor((coordinates.length - 1) / 2)));

  return (
    <figure aria-label={label} className="m-0 min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a3e635" stopOpacity=".28" />
            <stop offset="1" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line key={ratio} x1={inset.left} x2={width - inset.right} y1={inset.top + ratio * innerHeight} y2={inset.top + ratio * innerHeight} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
        ))}
        {area ? <path d={area} fill={`url(#${id}-area)`} /> : null}
        <polyline points={line} fill="none" stroke="#a3e635" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map(({ x, y, label: pointLabel, detail }) => <circle key={`${pointLabel}-${x}`} cx={x} cy={y} r="4" fill="#a3e635"><title>{detail ?? `${pointLabel} ${formatValue(points.find((point) => point.label === pointLabel)?.value)}`}</title></circle>)}
        {coordinates.length > 0 ? <circle cx={coordinates.at(-1)!.x} cy={coordinates.at(-1)!.y} r="4" fill="#f4f4f5" stroke="#a3e635" strokeWidth="1.5" /> : null}
        {visibleLabels.map(({ x, label: pointLabel }) => (
          <text key={pointLabel} x={x} y={height - 6} fill={pointLabel === coordinates.at(-1)?.label ? '#bef264' : '#71717a'} fontSize="10" textAnchor={x < width / 3 ? 'start' : x > width * 0.66 ? 'end' : 'middle'}>
            {pointLabel}
          </text>
        ))}
      </svg>
    </figure>
  );
}

function formatValue(value: number | undefined) { return value === undefined ? '' : Number.isInteger(value) ? String(value) : value.toFixed(1); }
