import { useMemo, useState } from 'react';
import { Campaign, getParty } from '@dos/shared';
import { useV } from '../store.js';
import type { Demographic } from '../api.js';

const DEMOGRAPHICS: Demographic[] = ['pensionarer', 'arbetstagare', 'unga', 'barnfamiljer'];
const TOTAL_HOURS = 10;

const DEMO_META: Record<Demographic, { icon: string; label: string }> = {
  pensionarer: { icon: '👴', label: 'Pensionärer' },
  arbetstagare: { icon: '👷', label: 'Arbetstagare' },
  unga: { icon: '🎓', label: 'Unga' },
  barnfamiljer: { icon: '👨‍👩‍👧', label: 'Barnfamiljer' },
};

// Spegling av serverns receptivitetstabell – anvands for liveprognos.
const RECEPTIVENESS: Record<string, Record<Demographic, number>> = {
  s:  { pensionarer: 1.3, arbetstagare: 1.4, unga: 0.9, barnfamiljer: 1.1 },
  m:  { pensionarer: 1.1, arbetstagare: 1.2, unga: 0.9, barnfamiljer: 1.3 },
  sd: { pensionarer: 1.4, arbetstagare: 1.3, unga: 0.8, barnfamiljer: 1.0 },
  v:  { pensionarer: 0.9, arbetstagare: 1.2, unga: 1.4, barnfamiljer: 1.1 },
  c:  { pensionarer: 1.1, arbetstagare: 1.0, unga: 1.0, barnfamiljer: 1.2 },
  kd: { pensionarer: 1.4, arbetstagare: 1.0, unga: 0.8, barnfamiljer: 1.3 },
  mp: { pensionarer: 0.8, arbetstagare: 1.0, unga: 1.5, barnfamiljer: 1.1 },
  l:  { pensionarer: 1.0, arbetstagare: 1.1, unga: 1.1, barnfamiljer: 1.2 },
};

function receptivityLabel(mult: number): string {
  if (mult >= 1.3) return 'Stark fit';
  if (mult >= 1.1) return 'Bra fit';
  if (mult >= 1.0) return 'Neutralt';
  return 'Svag fit';
}

export function VRegional({ onClose }: { onClose: () => void }) {
  const doAction = useV((s) => s.doAction);
  const busy = useV((s) => s.busy);
  const state = useV((s) => s.state)!;
  const partyId = state.you.partyId ?? 's';
  const party = getParty(partyId);
  const rec = RECEPTIVENESS[partyId] ?? RECEPTIVENESS.s;

  const [valkretsId, setValkretsId] = useState(state.you.regionId ?? 'sthlm-stad');
  const [alloc, setAlloc] = useState<Record<Demographic, number>>({
    pensionarer: 0, arbetstagare: 0, unga: 0, barnfamiljer: 0,
  });

  const used = useMemo(() => DEMOGRAPHICS.reduce((a, d) => a + alloc[d], 0), [alloc]);
  const remaining = TOTAL_HOURS - used;
  const effect = useMemo(
    () => DEMOGRAPHICS.reduce((a, d) => a + alloc[d] * rec[d], 0),
    [alloc, rec],
  );
  const supportDelta = Math.round(effect * 0.55 * 10) / 10;

  const inc = (d: Demographic) => {
    if (remaining <= 0) return;
    setAlloc((a) => ({ ...a, [d]: a[d] + 1 }));
  };
  const dec = (d: Demographic) => {
    if (alloc[d] <= 0) return;
    setAlloc((a) => ({ ...a, [d]: a[d] - 1 }));
  };

  const submit = async () => {
    if (used === 0) return;
    await doAction('regional', { valkretsId, allocation: alloc });
    onClose();
  };

  const vk = Campaign.VALKRETS_BY_ID[valkretsId];

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div className="v-modal v-regional" onClick={(e) => e.stopPropagation()}>
        <h2>📍 Kampanja regionalt</h2>
        <p className="muted small">
          Fördela {TOTAL_HOURS} kampanjtimmar över demografier. Olika partier
          når olika grupper – hitta din bästa väg i {vk?.name}.
        </p>

        <label className="field">
          <span>Valkrets</span>
          <select
            className="team-party-select"
            value={valkretsId}
            onChange={(e) => setValkretsId(e.target.value)}
          >
            {Campaign.VALKRETSAR.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.mandate} mandat)
              </option>
            ))}
          </select>
        </label>

        <div className="v-reg-hours">
          <div className="v-reg-hours-bar">
            <div className="v-reg-hours-fill" style={{ width: `${(used / TOTAL_HOURS) * 100}%`, background: party.color }} />
          </div>
          <span>
            <strong>{used}</strong> / {TOTAL_HOURS} timmar fördelade · <strong>{remaining}</strong> kvar
          </span>
        </div>

        <div className="v-reg-demos">
          {DEMOGRAPHICS.map((d) => {
            const m = DEMO_META[d];
            const mult = rec[d];
            const demoEffect = Math.round(alloc[d] * mult * 10) / 10;
            return (
              <div key={d} className="v-reg-demo">
                <div className="v-reg-demo-head">
                  <span className="v-reg-demo-icon">{m.icon}</span>
                  <span className="v-reg-demo-label">{m.label}</span>
                  <span className={`v-reg-fit v-reg-fit-${mult >= 1.3 ? 'strong' : mult >= 1.1 ? 'good' : mult >= 1.0 ? 'neu' : 'weak'}`}>
                    ×{mult} {receptivityLabel(mult)}
                  </span>
                </div>
                <div className="v-reg-demo-ctrl">
                  <button className="icon-btn" onClick={() => dec(d)} disabled={alloc[d] <= 0}>−</button>
                  <strong className="v-reg-demo-hrs">{alloc[d]}h</strong>
                  <button className="icon-btn" onClick={() => inc(d)} disabled={remaining <= 0}>+</button>
                  <span className="v-reg-demo-eff muted small">→ +{demoEffect} effekt</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="v-reg-preview" style={{ borderColor: party.color }}>
          Beräknad effekt: <strong>{Math.round(effect * 10) / 10}</strong> · tillför <strong>{supportDelta}</strong> stöd i {vk?.shortName}
        </div>

        <button className="btn btn-primary btn-big" disabled={busy || used === 0} onClick={submit}>
          Starta kampanjen
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Avbryt</button>
      </div>
    </div>
  );
}
