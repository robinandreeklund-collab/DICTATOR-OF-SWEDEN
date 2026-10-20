import { useState } from 'react';
import { getParty } from '@dos/shared';
import { useV } from '../store.js';
import { api, type AllianceOffer } from '../api.js';

const RIKSDAG = ['s', 'm', 'sd', 'v', 'c', 'kd', 'mp', 'l'];

export function VAlliance({ onClose }: { onClose: () => void }) {
  const doAction = useV((s) => s.doAction);
  const token = useV((s) => s.token)!;
  const busy = useV((s) => s.busy);
  const state = useV((s) => s.state)!;
  const myPartyId = state.you.partyId ?? 's';

  const [offer, setOffer] = useState<AllianceOffer | null>(null);
  const [accepted, setAccepted] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openOffer = async (allyPartyId: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.allianceOffer(token, allyPartyId);
      setOffer(r.offer);
      setAccepted(r.offer.demands.map(() => false));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    setAccepted((a) => a.map((v, idx) => (idx === i ? !v : v)));
  };

  const submit = async () => {
    if (!offer) return;
    await doAction('alliance', { allyPartyId: offer.allyPartyId, accepted });
    onClose();
  };

  const compatLabel = (c: number): string => {
    if (c >= 0.7) return 'Hög vilja att samarbeta';
    if (c >= 0.5) return 'Osäker vilja';
    if (c >= 0.4) return 'Låg vilja – svårt att få igenom';
    return 'Ovänliga – nästan hopplöst';
  };

  const yesCount = accepted.filter(Boolean).length;
  const predict = offer ? Math.round((offer.compat + 0.17 * yesCount) * 100) : 0;

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div className="v-modal v-alliance" onClick={(e) => e.stopPropagation()}>
        <h2>🤝 Förhandla allians</h2>

        {!offer && (
          <>
            <p className="muted small">Välj parti att öppna förhandling med.</p>
            {err && <p className="toast-error" style={{ position: 'static', margin: '8px 0' }}>{err}</p>}
            <div className="v-alliance-partners">
              {RIKSDAG.filter((p) => p !== myPartyId).map((p) => {
                const party = getParty(p);
                return (
                  <button
                    key={p}
                    className="v-alliance-partner"
                    style={{ borderColor: party.color }}
                    disabled={loading}
                    onClick={() => openOffer(p)}
                  >
                    <span className="v-party-mark" style={{ background: party.color }}>{party.shortName}</span>
                    <span className="v-ap-name">{party.name}</span>
                    <span className="v-ap-leader muted small">{party.leader}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn btn-ghost" onClick={onClose}>Avbryt</button>
          </>
        )}

        {offer && (
          <>
            <div className="v-alliance-partner v-ap-chosen" style={{ borderColor: getParty(offer.allyPartyId).color }}>
              <span className="v-party-mark" style={{ background: getParty(offer.allyPartyId).color }}>
                {getParty(offer.allyPartyId).shortName}
              </span>
              <span className="v-ap-name">{getParty(offer.allyPartyId).name}</span>
              <span className="v-ap-leader muted small">{compatLabel(offer.compat)} · {Math.round(offer.compat * 100)}% baslinje</span>
            </div>
            <p className="muted small">
              De vill se dessa krav uppfyllda. Du bestämmer vilka du accepterar – ju fler desto större chans att dealen går igenom, men kraven påverkar vad du står för.
            </p>
            <ul className="v-alliance-demands">
              {offer.demands.map((d, i) => (
                <li key={d.id} className={`v-alliance-demand ${accepted[i] ? 'v-ad-on' : ''}`}>
                  <div className="v-ad-text">
                    <span className="v-ad-topic">{d.topic}</span>
                    <span>{d.text}</span>
                  </div>
                  <button className="btn btn-small" onClick={() => toggle(i)}>
                    {accepted[i] ? '✓ Accepterat' : 'Acceptera'}
                  </button>
                </li>
              ))}
            </ul>
            <div className="v-alliance-predict">
              Prognos: <strong>{predict}%</strong> – {predict >= 100 ? 'Deal går igenom' : 'Riskerar brott'}
            </div>
            <button className="btn btn-primary btn-big" disabled={busy} onClick={submit}>
              Lämna erbjudandet
            </button>
            <button className="btn btn-ghost" onClick={() => setOffer(null)}>Välj annat parti</button>
          </>
        )}
      </div>
    </div>
  );
}
