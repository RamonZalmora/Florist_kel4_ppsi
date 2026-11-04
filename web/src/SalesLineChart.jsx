import React, { useId } from 'react';
import { money, date } from './api';

export function SalesLineChart({
  trend = [],
  label = 'Tren penjualan',
  compact = false,
  monthly = false,
}) {
  const gradient = useId().replace(/:/g, '');
  const width = 720,
    height = compact ? 155 : 240,
    padX = 60,
    padY = compact ? 16 : 24;
  const max = Math.max(1, ...trend.map((t) => Number(t.total)));
  const points = trend.map((t, i) => ({
    x: padX + (trend.length === 1 ? 0.5 : i / (trend.length - 1)) * (width - padX - 24),
    y: height - padY - (Number(t.total) / max) * (height - padY * 2),
    ...t,
  }));
  const path = points
    .map((p, i) => {
      if (!i) return `M ${p.x} ${p.y}`;
      const previous = points[i - 1];
      const middle = (previous.x + p.x) / 2;
      return `C ${middle} ${previous.y}, ${middle} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(' ');
  const area = points.length
    ? `${path} L ${points.at(-1).x} ${height - padY} L ${points[0].x} ${height - padY} Z`
    : '';
  return (
    <div className="sales-line-chart">
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        preserveAspectRatio={compact ? 'none' : 'xMidYMid meet'}
        role="img"
        aria-label={label + ': ' + trend.map((t) => date(t.day) + ' ' + money(t.total)).join(', ')}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#467aaf" stopOpacity=".4" />
            <stop offset="65%" stopColor="#438d98" stopOpacity=".14" />
            <stop offset="100%" stopColor="#438d98" stopOpacity=".02" />
          </linearGradient>
          <linearGradient id={gradient + '-line'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#23486a" />
            <stop offset="50%" stopColor="#467aaf" />
            <stop offset="100%" stopColor="#438d98" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <g key={r}>
            <line
              x1={padX}
              x2={width - 24}
              y1={height - padY - r * (height - padY * 2)}
              y2={height - padY - r * (height - padY * 2)}
              stroke="#dbe9f4"
              strokeDasharray="4 5"
            />
            <text
              x="3"
              y={height - padY - r * (height - padY * 2) + 4}
              fontSize="11"
              fontWeight="600"
              fill="#607991"
            >
              {r === 0
                ? 'Rp 0'
                : money(max * r)
                    .replace('Rp', '')
                    .trim()}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${gradient})`} />
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradient}-line)`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={p.x} cy={p.y} r="9" fill="#4c8dcb" fillOpacity=".1" />
            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#467cbd" strokeWidth="2.5">
              <title>
                {date(p.day)}: {money(p.total)}
              </title>
            </circle>
            {(trend.length <= 8 ||
              i === 0 ||
              i === trend.length - 1 ||
              i % Math.ceil(trend.length / 7) === 0) && (
              <text
                x={p.x}
                y={height + 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#607991"
              >
                {new Date(p.day).toLocaleDateString(
                  'id-ID',
                  monthly
                    ? { month: 'short', year: '2-digit' }
                    : { day: 'numeric', month: 'short' },
                )}
              </text>
            )}
          </g>
        ))}
      </svg>
      {!trend.length && <p className="hint">Belum ada penjualan pada periode ini.</p>}
    </div>
  );
}
