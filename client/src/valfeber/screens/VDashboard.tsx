import { useEffect, useState } from 'react';
import { Campaign, getParty } from '@dos/shared';
import { useV } from '../store.js';
import { useCountUp } from '../../hooks.js';
import { RiksdagArc } from '../../components/campaign/RiksdagArc.js';
import { VMap } from '../components/VMap.js';
import { VSocial } from '../components/VSocial.js';
import { VDebate } from '../components/VDebate.js';
import { VViral } from '../components/VViral.js';
import { VRegional } from '../components/VRegional.js';
import { VCrisis } from '../components/VCrisis.js';
import { VAlliance } from '../components/VAlliance.js';

const ACH_LABEL: Record<string, string> = {
  first_action: 'Första steget', viral: 'Gick viralt',
  allians: 'Alliansbyggare', streak7: '7 dagar i rad',
  debattmastare: 'Debattmästare',
};
const ACTIONS = [
  { kind: 'crisis', icon: '🔥', label: 'Hantera dagens kris', desc: 'Störst effekt — vänd opinionen.' },
  { kind: 'debate', icon: '🎤', label: 'Svara i debatt', desc: 'Övertyga väljarna i sakfrågor.' },
  { kind: 'viral', icon: '📱', label: 'Skriv viral post', desc: 'Chans att spridas i hela landet.' },
  { kind: 'regional', icon: '📍', label: 'Kampanja regionalt', desc: 'Höj stödet i en valkrets.' },
  { kind: 'alliance', icon: '🤝', label: 'Förhandla allians', desc: 'Samarbeta med ett annat parti.' },
] as const;

function useCountdown(ms: number): string {
  const [target] = useState(() => Date.now() + ms);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, target - Date.now());
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export function VDashboard() {
  const state = useV((s) => s.state)!;
  const logout = useV((s) => s.logout);
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [lbTab, setLbTab] = useState<'global' | 'party' | 'region'>('global');

  const me = state.you;
  const party = me.partyId ? getParty(me.partyId) : null;
  const myStanding = state.standings.find((s) => s.partyId === me.partyId);
  const countdown = useCountdown(state.world.msToNextDay);

  const myMandate = useCountUp(myStanding?.mandates ?? 0);
  const points = useCountUp(me.points);

  let redgron = 0;
  let tido = 0;
  for (const s of state.standings) {
    if (Campaign.blocOf(s.partyId) === 'redgron') redgron += s.mandates;
    else tido += s.mandates;
  }

  const lb = state.leaderboards[lbTab];

  return (
    <div className="v-dash">
      <header className="v-top">
        <div className="v-top-left">
          <h1>Valfeber 2026</h1>
          <span className="v-day">
            Dag {state.world.day + 1} av {state.world.totalDays} · nästa dag om {countdown}
          </span>
        </div>
        <div className="v-top-right">
          {party && (
            <span className="v-myparty" style={{ borderColor: party.color }}>
              <span className="v-party-mark" style={{ background: party.color }}>{party.shortName}</span>
              {party.name}
            </span>
          )}
          <button className="btn btn-ghost btn-small" onClick={logout}>Logga ut</button>
        </div>
      </header>

      <div className={`v-event ${state.event.crisis ? 'v-event-crisis' : ''}`}>
        <span className="v-event-eyebrow">{state.event.crisis ? '⚠ Dagens kris' : '📰 Dagens stora nyhet'}</span>
        <strong>{state.event.title}</strong>
        <p>{state.event.body}</p>
        <span className="news-source">Källa: {state.event.source}</span>
      </div>

      <div className="v-grid">
        <div className="v-main">
          <section className="card v-opinion">
            <div className="v-opinion-head">
              <h2>Riksdagen just nu</h2>
              {myStanding && (
                <span className="v-myresult" style={{ color: party?.color }}>
                  {party?.shortName}: <strong>{myStanding.percent.toFixed(1)}%</strong> · {myMandate} mandat
                </span>
              )}
            </div>
            <RiksdagArc
              projection={state.standings.map((s) => ({
                partyId: s.partyId, percent: s.percent, mandates: s.mandates,
                passedThreshold: s.passedThreshold,
              }))}
              redgron={redgron}
              tido={tido}
            />
          </section>

          <section className="card">
            <div className="section-head">
              <h2>Dina åtgärder idag</h2>
              <span className="v-actions-left">{me.actionsLeft} kvar</span>
            </div>
            <div className="v-actions">
              {ACTIONS.map((a) => (
                <button
                  key={a.kind}
                  className="v-action-card"
                  disabled={me.actionsLeft <= 0}
                  onClick={() => setOpenAction(a.kind)}
                >
                  <span className="v-action-icon">{a.icon}</span>
                  <span className="v-action-label">{a.label}</span>
                  <span className="v-action-desc">{a.desc}</span>
                </button>
              ))}
            </div>
            {me.actionsLeft <= 0 && (
              <p className="muted small">Du har använt dagens åtgärder. Kom tillbaka imorgon!</p>
            )}
          </section>
        </div>

        <aside className="v-side">
          <section className="card v-stats">
            <div className="v-stat"><span className="v-stat-num">{points}</span><span className="v-stat-lbl">poäng</span></div>
            <div className="v-stat"><span className="v-stat-num">#{me.rank}</span><span className="v-stat-lbl">placering</span></div>
            <div className="v-stat"><span className="v-stat-num">{me.streak}🔥</span><span className="v-stat-lbl">dagar i rad</span></div>
          </section>

          <section className="card">
            <h2>Karta</h2>
            <VMap leaders={state.mapLeaders} homeRegion={me.regionId} />
          </section>

          <section className="card">
            <div className="v-lb-tabs">
              {(['global', 'party', 'region'] as const).map((t) => (
                <button key={t} className={`v-tab ${lbTab === t ? 'v-tab-on' : ''}`} onClick={() => setLbTab(t)}>
                  {t === 'global' ? 'Hela landet' : t === 'party' ? 'Mitt parti' : 'Min region'}
                </button>
              ))}
            </div>
            <ol className="v-lb">
              {lb.map((row, i) => (
                <li key={row.username + i} className={row.username === me.username ? 'v-lb-me' : ''}>
                  <span className="v-lb-rank">{i + 1}</span>
                  {row.party_id && (
                    <span className="v-party-mark v-lb-mark" style={{ background: getParty(row.party_id).color }}>
                      {getParty(row.party_id).shortName}
                    </span>
                  )}
                  <span className="v-lb-name">{row.username}</span>
                  <span className="v-lb-pts">{row.points}p</span>
                </li>
              ))}
              {lb.length === 0 && <p className="muted small">Inga spelare än.</p>}
            </ol>
          </section>

          {me.partyId && <VSocial partyId={me.partyId} />}

          {state.alliances.length > 0 && (
            <section className="card">
              <h2>Aktiva samarbeten</h2>
              <div className="v-alliances">
                {state.alliances.slice(0, 8).map((a, i) => (
                  <span key={i} className="v-alliance">
                    <span className="v-party-mark v-lb-mark" style={{ background: getParty(a.party_a).color }}>
                      {getParty(a.party_a).shortName}
                    </span>
                    🤝
                    <span className="v-party-mark v-lb-mark" style={{ background: getParty(a.party_b).color }}>
                      {getParty(a.party_b).shortName}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {me.achievements.length > 0 && (
            <section className="card">
              <h2>Utmärkelser</h2>
              <div className="v-ach-list">
                {me.achievements.map((a) => (
                  <span key={a} className="v-ach">🏆 {ACH_LABEL[a] ?? a}</span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {openAction === 'debate' && state.debate && (
        <VDebate debate={state.debate} onClose={() => setOpenAction(null)} />
      )}
      {openAction === 'viral' && (
        <VViral onClose={() => setOpenAction(null)} />
      )}
      {openAction === 'regional' && (
        <VRegional onClose={() => setOpenAction(null)} />
      )}
      {openAction === 'crisis' && (
        <VCrisis onClose={() => setOpenAction(null)} />
      )}
      {openAction === 'alliance' && (
        <VAlliance onClose={() => setOpenAction(null)} />
      )}
    </div>
  );
}
