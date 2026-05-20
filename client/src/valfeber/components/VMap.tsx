import { Campaign, getParty } from '@dos/shared';

const OUTLINE =
  'M240 50 L310 140 L325 250 L335 350 L320 430 L340 470 L362 512 ' +
  'L330 555 L312 610 L305 665 L292 715 L255 800 L228 872 L175 888 ' +
  'L132 858 L128 778 L152 712 L80 670 L110 612 L84 548 L138 478 ' +
  'L116 398 L164 322 L138 242 L182 162 L210 92 Z';

export function VMap({
  leaders,
  homeRegion,
}: {
  leaders: Record<string, string>;
  homeRegion: string | null;
}) {
  return (
    <div className="v-map">
      <svg viewBox="0 0 460 1000" className="v-map-svg" role="img" aria-label="Sverigekarta">
        <defs>
          <radialGradient id="vSea" cx="50%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#22416e" />
            <stop offset="100%" stopColor="#0a1120" />
          </radialGradient>
          <filter id="vGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="460" height="1000" fill="url(#vSea)" />
        <path d={OUTLINE} fill="#1f3458" stroke="rgba(216,177,90,0.3)" strokeWidth="1.5" />
        {Campaign.VALKRETSAR.map((vk) => {
          const leader = leaders[vk.id] ?? 's';
          const color = getParty(leader).color;
          const r = 6 + Math.sqrt(vk.mandate) * 2.3;
          const home = vk.id === homeRegion;
          return (
            <g key={vk.id} transform={`translate(${vk.x} ${vk.y})`}>
              <circle r={r} fill={color} fillOpacity={0.92} filter="url(#vGlow)"
                stroke={home ? '#f4e2b0' : 'rgba(255,255,255,0.5)'} strokeWidth={home ? 2.6 : 1} />
              {home && <circle className="v-map-home" r={r + 5} fill="none" stroke="#f4e2b0" strokeWidth="1.5" />}
            </g>
          );
        })}
      </svg>
      {homeRegion && (
        <p className="muted small v-map-cap">Din region: {Campaign.VALKRETS_BY_ID[homeRegion]?.name}</p>
      )}
    </div>
  );
}
