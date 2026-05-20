import { useState } from 'react';
import { Campaign, PARTIES } from '@dos/shared';
import { useV } from '../store.js';

const RIKSDAG = ['s', 'm', 'sd', 'v', 'c', 'kd', 'mp', 'l'];

export function VOnboarding() {
  const choose = useV((s) => s.choose);
  const busy = useV((s) => s.busy);
  const [party, setParty] = useState<string | null>(null);
  const [region, setRegion] = useState<string>('sthlm-stad');

  const parties = PARTIES.filter((p) => RIKSDAG.includes(p.id));

  return (
    <div className="v-onboard">
      <h1>Välj ditt parti</h1>
      <p className="muted">
        Alla som spelar samma parti bygger ett gemensamt opinionsläge. Du kämpar för
        att just ditt parti ska vinna valet 2026.
      </p>

      <div className="v-party-grid">
        {parties.map((p) => (
          <button
            key={p.id}
            className={`v-party-card ${party === p.id ? 'v-party-on' : ''}`}
            style={{ borderColor: party === p.id ? p.color : undefined }}
            onClick={() => setParty(p.id)}
          >
            <span className="v-party-mark" style={{ background: p.color }}>
              {p.shortName}
            </span>
            <span className="v-party-name">{p.name}</span>
            <span className="v-party-leader">{p.leader}</span>
          </button>
        ))}
      </div>

      <label className="field v-region-field">
        <span>Din hemregion (valkrets)</span>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {Campaign.VALKRETSAR.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn btn-primary btn-big"
        disabled={!party || busy}
        onClick={() => party && choose(party, region)}
      >
        {busy ? 'Startar…' : 'Gå med i kampanjen'}
      </button>
    </div>
  );
}
