import React, { useId } from 'react';

export function OrderStatusChart({ trend = [], monthly = false }) {
  const gradient = useId().replace(/:/g, '');
  const width = 720,
    height = 155,
    left = 30,
    right = 14,
    top = 14,
    bottom = 25;
  const max = Math.max(1, ...trend.flatMap((day) => [Number(day.completed), Number(day.pending)]));
  const points = (key) =>
    trend.map((day, i) => ({
      x: left + (trend.length === 1 ? 0.5 : i / (trend.length - 1)) * (width - left - right),
      y: height - bottom - (Number(day[key]) / max) * (height - top - bottom),
      ...day,
    }));
  const curve = (values) =>
    values
      .map((point, i) => {
        if (!i) return `M ${point.x} ${point.y}`;
        const previous = values[i - 1],
          middle = (point.x + previous.x) / 2;
        return `C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
      })
      .join(' ');
  const completed = points('completed'),
    pending = points('pending');
  const path = curve(completed);
  const area = completed.length
    ? `${path} L ${completed.at(-1).x} ${height - bottom} L ${completed[0].x} ${height - bottom} Z`
    : '';
  const dayLabel = (day) =>
    new Date(day + 'T12:00:00+07:00').toLocaleDateString(
      'id-ID',
      monthly
        ? { month: 'short', year: '2-digit', timeZone: 'Asia/Jakarta' }
        : { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' },
    );
  return (
    <div className="order-status-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          'Grafik status pesanan: ' +
          trend
            .map((day) => `${day.day}: ${day.completed} selesai, ${day.pending} belum selesai`)
            .join('; ')
        }
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52b6bc" stopOpacity=".3" />
            <stop offset="100%" stopColor="#7cb8e0" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[...new Set([0, Math.ceil(max / 2), max])].map((value) => {
          const y = height - bottom - (value / max) * (height - top - bottom);
          return (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#dce7f3"
                strokeDasharray="4 5"
              />
              <text x="4" y={y + 4} fontSize="10" fontWeight="600" fill="#8199ae">
                {value}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${gradient})`} />
        <path d={path} fill="none" stroke="#328eaa" strokeWidth="3" strokeLinecap="round" />
        <path
          d={curve(pending)}
          fill="none"
          stroke="#d9a35e"
          strokeWidth="2.5"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
        {completed.map((point, i) => (
          <g key={point.day}>
            <circle cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke="#328eaa" strokeWidth="2">
              <title>
                {dayLabel(point.day)}: {point.completed} selesai, {point.pending} belum selesai
              </title>
            </circle>
            {(trend.length <= 7 ||
              i === 0 ||
              i === trend.length - 1 ||
              i % Math.ceil(trend.length / 6) === 0) && (
              <text
                x={point.x}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="#7d95ab"
              >
                {dayLabel(point.day)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {!trend.length && <p className="order-chart-empty">Belum ada pesanan pada periode ini.</p>}
    </div>
  );
}
