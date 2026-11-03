import React, { useId } from 'react';
import { money, date } from './api';

export function SalesLineChart({ trend = [], label = 'Tren penjualan' }) {
  const gradient = useId().replace(/:/g, '');
  const width = 720,
    height = 240,
    padX = 60,
    padY = 24;
  const max = Math.max(1, ...trend.map((t) => Number(t.total)));
  const points = trend.map((t, i) => ({
    x: padX + (trend.length === 1 ? 0.5 : i / (trend.length - 1)) * (width - padX - 24),
    y: height - padY - (Number(t.total) / max) * (height - padY * 2),
    ...t,
  }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const area = points.length
    ? `${path} L ${points.at(-1).x} ${height - padY} L ${points[0].x} ${height - padY} Z`
    : '';
  return (
    <div className="sales-line-chart">
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        role="img"
        aria-label={label + ': ' + trend.map((t) => date(t.day) + ' ' + money(t.total)).join(', ')}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19a7c7" stopOpacity=".3" />
            <stop offset="100%" stopColor="#19a7c7" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((r) => (
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
              fontSize="10"
              fill="#7793a8"
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
          stroke="#147da9"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#1399b4" strokeWidth="2">
              <title>
                {date(p.day)}: {money(p.total)}
              </title>
            </circle>
            {(trend.length <= 8 ||
              i === 0 ||
              i === trend.length - 1 ||
              i % Math.ceil(trend.length / 7) === 0) && (
              <text x={p.x} y={height + 6} textAnchor="middle" fontSize="10" fill="#6f8ba1">
                {new Date(p.day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </text>
            )}
          </g>
        ))}
      </svg>
      {!trend.length && <p className="hint">Belum ada penjualan pada periode ini.</p>}
    </div>
  );
}
