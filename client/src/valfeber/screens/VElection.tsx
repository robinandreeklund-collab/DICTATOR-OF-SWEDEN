import { getParty } from '@dos/shared';
import { useV } from '../store.js';
import { RiksdagArc } from '../../components/campaign/RiksdagArc.js';

export function VElection() {
  const state = useV((s) => s.state)!;
  const logout = useV((s) => s.logout);
  const el = state.election!;
  const me = state.you;
  const party = me.partyId ? getParty(me.partyId) : null;
  const myStanding = state.standings.find((s) => s.partyId === me.partyId);
  const won = party ? (el.governingBloc === (['s', 'v', 'mp', 'c'].includes(party.id) ? 'redgron' : 'tido')) : false;

  return (
    <div className="v-election">
      <div className={`v-el-banner v-el-${el.governingBloc}`}>
        <span className="go-sub">Valnatten 13 september 2026</span>
        <h1>{el.governingBloc === 'redgron' ? 'Rödgröna sidan' : 'Tidö-sidan'} bildar regering</h1>
        <p>Rödgröna {el.redgron} mandat · Tidö {el.tido} mandat</p>
      </div>

      <section className="card">
        <RiksdagArc
          projection={state.standings.map((s) => ({
            partyId: s.partyId, percent: s.percent, mandates: s.mandates, passedThreshold: s.passedThreshold,
          }))}
          redgron={el.redgron}
          tido={el.tido}
        />
      </section>

      {party && myStanding && (
        <section className={`card v-el-you ${won ? 'v-el-win' : 'v-el-loss'}`}>
          <h2>{won ? '🎉 Ditt parti sitter i regering!' : 'Ditt parti hamnade i opposition'}</h2>
          <p>
            {party.name} fick <strong>{myStanding.percent.toFixed(1)}%</strong> och{' '}
            <strong>{myStanding.mandates}</strong> mandat.
          </p>
          <p className="muted">
            Du bidrog med {me.points} poäng till kampanjen och slutade på plats #{me.rank} i landet.
          </p>
        </section>
      )}

      <section className="card">
        <h2>Slutresultat</h2>
        <ul className="result-list">
          {state.standings.map((s) => (
            <li key={s.partyId} className={s.passedThreshold ? '' : 'result-out'}>
              <span className="seat-mark" style={{ background: s.color }}>{s.shortName}</span>
              <span className="result-name">{s.name}</span>
              <span className="result-pct">{s.percent.toFixed(1)}%</span>
              <span className="result-mandate">{s.passedThreshold ? `${s.mandates} mandat` : 'Under spärren'}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="row go-actions">
        <button className="btn btn-ghost" onClick={logout}>Logga ut</button>
      </div>
    </div>
  );
}
