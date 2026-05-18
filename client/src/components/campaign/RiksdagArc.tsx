import { useMemo } from 'react';
import { getParty, type NationalProjection } from '@dos/shared';

// Mandatfordelningen som en parlamentarisk halvcirkel (349 platser).

const SEAT_ORDER = ['v', 's', 'mp', 'c', 'l', 'kd', 'm', 'sd'];
const ROWS = 9;
const CX = 210;
const CY = 206;

interface Seat { x: number; y: number; angle: number; }

function buildSeats(total: number): Seat[] {
  const radii = Array.from({ length: ROWS }, (_, i) => 62 + i * 16);
  const wsum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.max(1, Math.round((total * r) / wsum)));
  let diff = total - counts.reduce((a, b) => a + b, 0);
  let idx = ROWS - 1;
  while (diff !== 0) {
    counts[idx] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    idx = (idx - 1 + ROWS) % ROWS;
  }
  const seats: Seat[] = [];
  radii.forEach((rad, row) => {
    const c = counts[row];
    for (let s = 0; s < c; s++) {
      const angle = Math.PI - ((s + 0.5) / c) * Math.PI;
      seats.push({
        x: CX + rad * Math.cos(angle),
        y: CY - rad * Math.sin(angle),
        angle,
      });
    }
  });
  return seats.sort((a, b) => b.angle - a.angle);
}

export function RiksdagArc({
  projection,
  redgron,
  tido,
}: {
  projection: NationalProjection[];
  redgron: number;
  tido: number;
}) {
  const seats = useMemo(() => buildSeats(349), []);

  // Tilldela platser parti for parti, vanster till hoger.
  const byParty: Record<string, number> = {};
  for (const p of projection) byParty[p.partyId] = p.mandates;
  const seatColors: string[] = [];
  for (const partyId of SEAT_ORDER) {
    const n = byParty[partyId] ?? 0;
    for (let i = 0; i < n; i++) seatColors.push(getParty(partyId).color);
  }
  while (seatColors.length < seats.length) seatColors.push('#2c3c5c');

  const leadBloc = redgron >= tido ? 'redgron' : 'tido';

  return (
    <div className="riksdag-arc">
      <svg viewBox="0 0 420 230" role="img" aria-label="Mandatfordelning">
        {seats.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={4.6}
            fill={seatColors[i]}
            className="seat-dot"
          />
        ))}
        <line x1={CX} y1={20} x2={CX} y2={44} className="majority-line" />
        <text x={CX} y={15} textAnchor="middle" className="majority-text">
          175
        </text>
      </svg>
      <div className="arc-blocs">
        <span className={`arc-bloc bloc-redgron ${leadBloc === 'redgron' ? 'bloc-lead' : ''}`}>
          Rodgrona <strong>{redgron}</strong>
        </span>
        <span className={`arc-bloc bloc-tido ${leadBloc === 'tido' ? 'bloc-lead' : ''}`}>
          Tido <strong>{tido}</strong>
        </span>
      </div>
    </div>
  );
}
