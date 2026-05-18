import { getParty, type ClientGameView } from '@dos/shared';

const BLOC_LABEL: Record<string, string> = {
  redgron: 'Rödgrön',
  tido: 'Tidö',
};

export function PlayerGrid({
  g,
  meId,
  selectableIds,
  onSelect,
}: {
  g: ClientGameView;
  meId: string;
  selectableIds?: string[];
  onSelect?: (id: string) => void;
}) {
  const selectable = new Set(selectableIds ?? []);

  return (
    <div className="player-grid">
      {g.players.map((p) => {
        const party = getParty(p.partyId);
        const isPresident = g.presidentId === p.id;
        const isTalman = g.nominatedTalmanId === p.id;
        const vote = g.votes[p.id];
        const canSelect = selectable.has(p.id) && !!onSelect;
        const investigated = g.you.investigationResults[p.id];

        return (
          <button
            key={p.id}
            type="button"
            className={`seat ${!p.alive ? 'seat-dead' : ''} ${
              canSelect ? 'seat-selectable' : ''
            } ${isPresident ? 'seat-president' : ''} ${isTalman ? 'seat-talman' : ''}`}
            style={{ borderColor: party.color }}
            disabled={!canSelect}
            onClick={() => canSelect && onSelect!(p.id)}
          >
            <span className="seat-mark" style={{ background: party.color }}>
              {party.shortName}
            </span>
            <span className="seat-name">
              {p.name}
              {p.id === meId && <em> (du)</em>}
            </span>
            <span className="seat-party">{party.name}</span>

            <span className="seat-roles">
              {isPresident && <span className="pill pill-pres">Statsminister</span>}
              {isTalman && <span className="pill pill-talman">Talman</span>}
              {!p.connected && <span className="pill pill-off">Frånvarande</span>}
              {!p.alive && <span className="pill pill-dead">Avsatt</span>}
            </span>

            {investigated && (
              <span className="seat-intel" title="Utredningsresultat">
                Block: {BLOC_LABEL[investigated] ?? investigated}
              </span>
            )}

            {vote === 'ja' && <span className="seat-vote vote-ja">JA</span>}
            {vote === 'nej' && <span className="seat-vote vote-nej">NEJ</span>}
            {vote === 'hidden' && <span className="seat-vote vote-cast">✓ röstat</span>}
          </button>
        );
      })}
    </div>
  );
}
