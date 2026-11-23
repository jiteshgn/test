import * as React from 'react';
import { range } from '../../utils/arrayUtils';

let instanceCounter: number = 0;

interface IBar {
  row: number;
  start: number;
  span: number;
  tone: 'teal' | 'green';
}

const COLUMNS: number = 12;
const ROWS: number = 9;
const CELL_W: number = 46;
const CELL_H: number = 34;
const LABEL_W: number = 92;

const BARS: IBar[] = [
  { row: 1, start: 1.2, span: 2.2, tone: 'teal' },
  { row: 1, start: 4.4, span: 2.6, tone: 'teal' },
  { row: 1, start: 8.1, span: 2.8, tone: 'teal' },
  { row: 2, start: 2.6, span: 1.8, tone: 'green' },
  { row: 2, start: 5.6, span: 2.0, tone: 'teal' },
  { row: 3, start: 0.4, span: 2.3, tone: 'teal' },
  { row: 3, start: 6.3, span: 3.6, tone: 'green' },
  { row: 4, start: 3.1, span: 2.4, tone: 'teal' },
  { row: 4, start: 7.4, span: 1.8, tone: 'teal' },
  { row: 5, start: 1.8, span: 3.1, tone: 'green' },
  { row: 5, start: 8.9, span: 2.4, tone: 'green' },
  { row: 6, start: 4.9, span: 2.9, tone: 'teal' },
  { row: 7, start: 2.3, span: 2.1, tone: 'green' },
  { row: 7, start: 6.8, span: 3.4, tone: 'teal' },
  { row: 8, start: 0.9, span: 2.7, tone: 'green' }
];

interface IHeroArtProps {
  className?: string;
}

const MONTHS: string[] = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Vector stand-in for the banner photograph (planning dashboard over a laptop).
 * Replace it with a real image through the "Banner image URL" web part property.
 */
export const HeroArt = React.memo(function HeroArt({ className }: IHeroArtProps): React.ReactElement {
  // One id per instance (created once), so two banners on a page never share gradient ids.
  const [id] = React.useState<string>(() => `alcHero${++instanceCounter}`);
  const gridW: number = LABEL_W + COLUMNS * CELL_W;
  const gridH: number = ROWS * CELL_H;

  return (
    <svg
      className={className}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Project planning dashboard"
    >
      <defs>
        <linearGradient id={`${id}Bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9d6d2" />
          <stop offset="0.35" stopColor="#8f8f90" />
          <stop offset="0.7" stopColor="#3c4045" />
          <stop offset="1" stopColor="#1b1d21" />
        </linearGradient>
        <radialGradient id={`${id}Shirt`} cx="0.25" cy="0.25" r="0.55">
          <stop offset="0" stopColor="#f3f1ee" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f3f1ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}Warm`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2b6a0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f2b6a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}Teal`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3fe0c8" />
          <stop offset="1" stopColor="#8ff7e6" />
        </linearGradient>
        <linearGradient id={`${id}Green`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3ccf6b" />
          <stop offset="1" stopColor="#9af59a" />
        </linearGradient>
        <linearGradient id={`${id}Laptop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2e34" stopOpacity="0" />
          <stop offset="1" stopColor="#0e1013" />
        </linearGradient>
        <filter id={`${id}Glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}Soft`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Background scene */}
      <rect width="800" height="500" fill={`url(#${id}Bg)`} />
      <rect width="800" height="500" fill={`url(#${id}Shirt)`} />
      <g filter={`url(#${id}Soft)`} opacity="0.9">
        <ellipse cx="160" cy="150" rx="70" ry="40" fill="#5c4a3c" opacity="0.55" />
        <ellipse cx="330" cy="420" rx="120" ry="60" fill={`url(#${id}Warm)`} />
        <ellipse cx="610" cy="330" rx="90" ry="40" fill={`url(#${id}Warm)`} opacity="0.7" />
        <circle cx="70" cy="330" r="22" fill="#ffffff" opacity="0.35" />
        <circle cx="240" cy="260" r="14" fill="#ffdcc8" opacity="0.5" />
      </g>

      {/* Laptop keyboard hint */}
      <g transform="translate(360 330) skewX(-32)" opacity="0.85">
        <rect x="0" y="0" width="520" height="190" fill={`url(#${id}Laptop)`} />
        {range(6).map((_: number, r: number) => (
          <g key={`k${r}`}>
            {range(14).map((__: number, c: number) => (
              <rect
                key={`k${r}-${c}`}
                x={40 + c * 32}
                y={70 + r * 18}
                width="26"
                height="13"
                rx="2"
                fill="#1f2329"
                stroke="#3a4048"
                strokeWidth="0.8"
              />
            ))}
          </g>
        ))}
        {MONTHS.map((m, i) => (
          <text key={m} x={180 + i * 44} y="58" fill="#cfd6dd" fontSize="11" fontFamily="Segoe UI, Arial" opacity="0.8">
            {m}
          </text>
        ))}
      </g>

      {/* Holographic gantt chart */}
      <g transform="translate(250 20) rotate(-9) skewX(-14)">
        <rect x="-8" y="-46" width={gridW + 16} height={gridH + 56} fill="#0f1a22" opacity="0.18" rx="6" />
        <rect x={LABEL_W + CELL_W * 2} y="-40" width={CELL_W * 5} height="20" rx="4" fill="#1aa3c9" opacity="0.85" />
        <text x={LABEL_W + CELL_W * 2 + 12} y="-26" fill="#e9fbff" fontSize="11" fontFamily="Segoe UI, Arial" fontWeight="600">
          Project Management
        </text>

        {range(COLUMNS + 1).map((_: number, c: number) => (
          <line
            key={`v${c}`}
            x1={LABEL_W + c * CELL_W}
            y1="0"
            x2={LABEL_W + c * CELL_W}
            y2={gridH}
            stroke="#e8f3f7"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
        ))}
        {range(ROWS + 1).map((_: number, r: number) => (
          <line
            key={`h${r}`}
            x1="0"
            y1={r * CELL_H}
            x2={gridW}
            y2={r * CELL_H}
            stroke="#e8f3f7"
            strokeOpacity={r === 0 || r === 1 ? 0.7 : 0.35}
            strokeWidth="1"
          />
        ))}
        <line x1="0" y1="0" x2="0" y2={gridH} stroke="#e8f3f7" strokeOpacity="0.6" />

        {range(COLUMNS).map((_: number, c: number) => (
          <text
            key={`n${c}`}
            x={LABEL_W + c * CELL_W + CELL_W / 2}
            y="22"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="13"
            fontWeight="700"
            fontFamily="Segoe UI, Arial"
            opacity="0.9"
          >
            {c + 1}
          </text>
        ))}
        <text x="10" y="22" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Segoe UI, Arial" opacity="0.85">
          Management
        </text>
        <text x="10" y={CELL_H * 3 + 22} fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Segoe UI, Arial" opacity="0.8">
          Project 1
        </text>
        <text x="10" y={CELL_H * 6 + 22} fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Segoe UI, Arial" opacity="0.8">
          Project 2
        </text>

        <g filter={`url(#${id}Glow)`}>
          {BARS.map((bar, i) => (
            <rect
              key={`b${i}`}
              x={LABEL_W + bar.start * CELL_W}
              y={bar.row * CELL_H + 11}
              width={bar.span * CELL_W}
              height="12"
              rx="6"
              fill={`url(#${id}${bar.tone === 'teal' ? 'Teal' : 'Green'})`}
            />
          ))}
        </g>
        <rect x={LABEL_W + CELL_W * 6.2} y={CELL_H * 5 + 9} width="16" height="16" rx="3" fill="#ff5b3a" opacity="0.9" />
      </g>

      {/* Hand + stylus suggestion */}
      <g opacity="0.85">
        <path
          d="M455 300 C 500 280, 560 285, 610 300 C 640 309, 655 330, 640 345 C 600 360, 520 352, 470 340 C 440 332, 432 310, 455 300 Z"
          fill="#e9a48c"
          opacity="0.55"
        />
        <line x1="560" y1="292" x2="700" y2="240" stroke="#d9dde2" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
      </g>
    </svg>
  );
});
