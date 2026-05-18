import { useStore } from '../store.js';
import { PHASE_LABEL } from '../lib.js';
import { Board } from '../components/Board.js';
import { PlayerGrid } from '../components/PlayerGrid.js';
import { ActionPanel } from '../components/ActionPanel.js';
import { RoleCard } from '../components/RoleCard.js';
import { RoleReveal } from '../components/RoleReveal.js';
import { GameLog } from '../components/GameLog.js';
import { GameOver } from '../components/GameOver.js';
import { Chat } from '../components/Chat.js';

export function Game() {
  const snapshot = useStore((s) => s.snapshot)!;
  const g = snapshot.game!;
  const meId = snapshot.you.id;
  const isHost = snapshot.you.isHost;

  if (g.phase === 'roleReveal') {
    return <RoleReveal g={g} />;
  }
  if (g.phase === 'gameOver') {
    return <GameOver g={g} isHost={isHost} />;
  }

  return (
    <div className="game">
      <header className="game-head">
        <div className="game-head-main">
          <h1>Riksdagen</h1>
          <span className="phase-pill">
            Runda {g.round} · {PHASE_LABEL[g.phase]}
          </span>
        </div>
        <span className="code-chip-static">Rum {snapshot.roomCode}</span>
      </header>

      <div className="game-body">
        <div className="game-left">
          <Board g={g} />
          <PlayerGrid g={g} meId={meId} />
          <ActionPanel g={g} meId={meId} />
        </div>
        <aside className="game-right">
          <RoleCard g={g} />
          <Chat messages={snapshot.chat} meId={meId} />
          <GameLog log={g.log} />
        </aside>
      </div>
    </div>
  );
}
