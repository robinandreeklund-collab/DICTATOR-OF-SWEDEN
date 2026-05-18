import { getParty, type CampaignClientView } from '@dos/shared';
import { useStore } from '../../store.js';
import { RiksdagArc } from './RiksdagArc.js';
import { playerName } from '../../campaignLib.js';

export function CampaignGameOver({ view, isHost }: { view: CampaignClientView; isHost: boolean }) {
  const restartGame = useStore((s) => s.restartGame);
  const leaveRoom = useStore((s) => s.leaveRoom);
  const r = view.result;
  if (!r) return null;
  const blocName = r.governingBloc === 'redgron' ? 'Rodgrona sidan' : 'Tido-sidan';

  return (
    <div className="game-over campaign-over">
      <div className={`go-banner go-${r.governingBloc === 'redgron' ? 'democrats' : 'antidemocrats'}`}>
        <span className="go-sub">Riksdagsvalet 2026 ar avgjort</span>
        <h1>{blocName} bildar regering</h1>
        <p>
          Rodgrona {r.redgronMandate} mandat · Tido {r.tidoMandate} mandat
        </p>
      </div>

      <section className="card">
        <h2>Riksdagen</h2>
        <RiksdagArc projection={view.projection} redgron={r.redgronMandate} tido={r.tidoMandate} />
      </section>

      <div className="go-grid">
        <section className="card">
          <h2>Valresultat</h2>
          <ul className="result-list">
            {r.parties.map((p) => {
              const party = getParty(p.partyId);
              return (
                <li key={p.partyId} className={p.passedThreshold ? '' : 'result-out'}>
                  <span className="seat-mark" style={{ background: party.color }}>
                    {party.shortName}
                  </span>
                  <span className="result-name">{party.name}</span>
                  <span className="result-pct">{p.votePercent.toFixed(1)}%</span>
                  <span className="result-mandate">
                    {p.passedThreshold ? `${p.mandates} mandat` : 'Under sparren'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2>Lagen och mullvadarna</h2>
          <ul className="team-result-list">
            {view.teams.map((t) => {
              const party = getParty(t.partyId);
              const teamWon = r.teamWon[t.id];
              const moleWon = r.moleWon[t.id];
              const moleId = view.finalMoles?.[t.id] ?? t.moleId;
              return (
                <li key={t.id} className="team-result">
                  <div className="team-result-head">
                    <span className="seat-mark" style={{ background: party.color }}>
                      {party.shortName}
                    </span>
                    <strong>{party.name}</strong>
                    <span className={`tag ${teamWon ? 'tag-ready' : 'tag-off'}`}>
                      {teamWon ? 'I regering' : 'I opposition'}
                    </span>
                  </div>
                  <p className="team-result-mole">
                    Mullvaden: <strong>{playerName(view, moleId)}</strong>
                    {t.moleStatus === 'exposed' ? ' (avslojad)' : ' (dold)'} —{' '}
                    {moleWon ? 'mullvaden lyckades' : 'mullvaden misslyckades'}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card facit-note">
        <h2>Facit: så funkar det på riktigt</h2>
        <p className="muted small">
          Sveriges riksdag har 349 mandat och valdagen 2026 var den 13 september.
          Ett parti maste fa minst 4 % av rosterna nationellt for att komma in -
          annars forsvinner alla dess mandat. For egen majoritet kravs 175 mandat;
          annars forhandlas en koalitions- eller minoritetsregering fram.
        </p>
      </section>

      <div className="row go-actions">
        {isHost ? (
          <button className="btn btn-primary" onClick={restartGame}>
            Tillbaka till lobbyn
          </button>
        ) : (
          <p className="muted">Varden kan ta tillbaka sallskapet till lobbyn.</p>
        )}
        <button className="btn btn-ghost" onClick={leaveRoom}>
          Lamna spelet
        </button>
      </div>
    </div>
  );
}
