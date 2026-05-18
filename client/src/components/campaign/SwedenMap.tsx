import { Campaign, getParty, type CampaignClientView } from '@dos/shared';

// Stiliserad karta over Sveriges 29 valkretsar. viewBox 0 0 460 1000.

const SWEDEN_OUTLINE =
  'M285 45 L320 150 L305 255 L330 355 L352 460 L372 505 ' +
  'L340 560 L315 625 L300 700 L288 765 L235 895 L170 890 ' +
  'L120 825 L108 755 L140 690 L78 650 L112 600 L88 535 ' +
  'L132 470 L104 395 L152 320 L120 235 L172 180 L205 110 L250 62 Z';

export function SwedenMap({
  view,
  selectedId,
  onSelect,
}: {
  view: CampaignClientView;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const supportById = new Map(view.valkretsar.map((v) => [v.id, v]));

  return (
    <div className="sweden-map">
      <svg viewBox="0 0 460 1000" className="sweden-svg" role="img" aria-label="Sverigekarta">
        <defs>
          <radialGradient id="seaGlow" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1d3357" />
            <stop offset="100%" stopColor="#0c1424" />
          </radialGradient>
          <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#243a5e" />
            <stop offset="100%" stopColor="#1a2a44" />
          </linearGradient>
          <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="460" height="1000" fill="url(#seaGlow)" />
        <path d={SWEDEN_OUTLINE} className="map-land" fill="url(#landGrad)" />

        {Campaign.VALKRETSAR.map((vk) => {
          const state = supportById.get(vk.id);
          const leader = state?.leadingParty ?? 's';
          const color = getParty(leader).color;
          const r = 7 + Math.sqrt(vk.mandate) * 2.4;
          const selected = selectedId === vk.id;
          return (
            <g
              key={vk.id}
              className={`map-node ${selected ? 'map-node-sel' : ''}`}
              transform={`translate(${vk.x} ${vk.y})`}
              onClick={() => onSelect(vk.id)}
            >
              <circle
                r={r}
                fill={color}
                fillOpacity={0.92}
                stroke={selected ? '#f4e2b0' : 'rgba(255,255,255,0.4)'}
                strokeWidth={selected ? 2.5 : 1}
                filter="url(#nodeGlow)"
              />
              <text className="map-node-mandate" textAnchor="middle" dy="0.35em">
                {vk.mandate}
              </text>
              {(selected || vk.mandate >= 16) && (
                <text className="map-node-label" textAnchor="middle" y={r + 12}>
                  {vk.shortName}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
