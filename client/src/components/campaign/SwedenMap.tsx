import { Campaign, getParty, type CampaignClientView } from '@dos/shared';

// Stiliserad karta over Sveriges 29 valkretsar. viewBox 0 0 460 1000.

const SWEDEN_OUTLINE =
  'M240 50 L310 140 L325 250 L335 350 L320 430 L340 470 L362 512 ' +
  'L330 555 L312 610 L305 665 L292 715 L255 800 L228 872 L175 888 ' +
  'L132 858 L128 778 L152 712 L80 670 L110 612 L84 548 L138 478 ' +
  'L116 398 L164 322 L138 242 L182 162 L210 92 Z';

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
          <radialGradient id="seaGlow" cx="50%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#22416e" />
            <stop offset="100%" stopColor="#0a1120" />
          </radialGradient>
          <linearGradient id="landGrad" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#2c4670" />
            <stop offset="55%" stopColor="#223a5e" />
            <stop offset="100%" stopColor="#172a47" />
          </linearGradient>
          <filter id="landShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#7da8e6" floodOpacity="0.25" />
          </filter>
          <filter id="nodeGlow" x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="4.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="460" height="1000" fill="url(#seaGlow)" />
        <path
          d={SWEDEN_OUTLINE}
          className="map-land"
          fill="url(#landGrad)"
          filter="url(#landShadow)"
        />

        {Campaign.VALKRETSAR.map((vk) => {
          const state = supportById.get(vk.id);
          const leader = state?.leadingParty ?? 's';
          const color = getParty(leader).color;
          const r = 7 + Math.sqrt(vk.mandate) * 2.5;
          const selected = selectedId === vk.id;
          return (
            <g
              key={vk.id}
              className={`map-node ${selected ? 'map-node-sel' : ''}`}
              transform={`translate(${vk.x} ${vk.y})`}
              onClick={() => onSelect(vk.id)}
            >
              <circle className="map-node-halo" r={r + 4} fill={color} />
              <circle
                className="map-node-core"
                r={r}
                fill={color}
                stroke={selected ? '#f4e2b0' : 'rgba(255,255,255,0.55)'}
                strokeWidth={selected ? 2.6 : 1.1}
                filter="url(#nodeGlow)"
              />
              <text className="map-node-mandate" textAnchor="middle" dy="0.34em">
                {vk.mandate}
              </text>
              {(selected || vk.mandate >= 14) && (
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
