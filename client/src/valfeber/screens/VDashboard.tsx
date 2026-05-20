import { useEffect, useState } from 'react';
import { ANSWER_OPTIONS, Campaign, getParty, type AnswerKey } from '@dos/shared';
import { useV } from '../store.js';
import { useCountUp } from '../../hooks.js';
import { RiksdagArc } from '../../components/campaign/RiksdagArc.js';
import { VMap } from '../components/VMap.js';
import type { ValfeberState } from '../api.js';

const RIKSDAG = ['s', 'm', 'sd', 'v', 'c', 'kd', 'mp', 'l'];
const SLOGANS = [
  'Trygghet i hela landet', 'Framtiden byggs nu', 'Rättvisa för vanligt folk',
  'Sverige kan bättre', 'Din röst gör skillnad', 'Ett varmare samhälle',
];
const ACH_LABEL: Record<string, string> = {
  first_action: 'Första steget', viral: 'Gick viralt',
  allians: 'Alliansbyggare', streak7: '7 dagar i rad',
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

      {openAction && <ActionModal kind={openAction} state={state} onClose={() => setOpenAction(null)} />}
    </div>
  );
}

function ActionModal({ kind, state, onClose }: { kind: string; state: ValfeberState; onClose: () => void }) {
  const doAction = useV((s) => s.doAction);
  const busy = useV((s) => s.busy);
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [slogan, setSlogan] = useState(0);
  const [region, setRegion] = useState(state.you.regionId ?? 'sthlm-stad');
  const [ally, setAlly] = useState<string | null>(null);

  const run = async (payload: Record<string, unknown>) => {
    await doAction(kind, payload);
    onClose();
  };

  const title = ACTIONS.find((a) => a.kind === kind)?.label ?? 'Åtgärd';

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div className="v-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>

        {kind === 'crisis' && (
          <>
            <p>{state.event.body}</p>
            <p className="muted small">Bemöt dagens händelse i din partis linje. Äger ditt parti frågan blir effekten större.</p>
            <button className="btn btn-primary btn-big" disabled={busy} onClick={() => run({})}>
              Hantera krisen
            </button>
          </>
        )}

        {kind === 'debate' && (
          <>
            {state.debate.map((q) => (
              <div key={q.id} className="v-q">
                <span className="v-q-topic">{q.topic}</span>
                <p className="v-q-statement">”{q.statement}”</p>
                <div className="v-q-opts">
                  {ANSWER_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      className={`btn btn-small ${answers[q.id] === o.key ? 'v-opt-on' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="btn btn-primary btn-big"
              disabled={busy || state.debate.some((q) => !answers[q.id])}
              onClick={() => run({ answers: state.debate.map((q) => answers[q.id]) })}
            >
              Leverera ditt svar
            </button>
          </>
        )}

        {kind === 'viral' && (
          <>
            <p className="muted small">Välj ditt budskap. Chansen finns att det går viralt.</p>
            <div className="v-slogans">
              {SLOGANS.map((s, i) => (
                <button key={i} className={`btn ${slogan === i ? 'v-opt-on' : ''}`} onClick={() => setSlogan(i)}>
                  ”{s}”
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-big" disabled={busy} onClick={() => run({ sloganIndex: slogan })}>
              Posta
            </button>
          </>
        )}

        {kind === 'regional' && (
          <>
            <p className="muted small">Välj var du lägger din kampanjkraft.</p>
            <select className="team-party-select" value={region} onChange={(e) => setRegion(e.target.value)}>
              {Campaign.VALKRETSAR.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.mandate} mandat)</option>
              ))}
            </select>
            <button className="btn btn-primary btn-big" disabled={busy} onClick={() => run({ valkretsId: region })}>
              Kampanja här
            </button>
          </>
        )}

        {kind === 'alliance' && (
          <>
            <p className="muted small">Vilket parti vill du samarbeta med?</p>
            <div className="v-ally-grid">
              {RIKSDAG.filter((p) => p !== state.you.partyId).map((p) => (
                <button key={p} className={`btn ${ally === p ? 'v-opt-on' : ''}`} onClick={() => setAlly(p)}>
                  <span className="v-party-mark" style={{ background: getParty(p).color }}>{getParty(p).shortName}</span>
                  {getParty(p).name}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-big" disabled={busy || !ally} onClick={() => run({ allyPartyId: ally })}>
              Förhandla
            </button>
          </>
        )}

        <button className="btn btn-ghost" onClick={onClose}>Avbryt</button>
      </div>
    </div>
  );
}
