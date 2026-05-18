import { useEffect, useRef } from 'react';
import type { LogEntry } from '@dos/shared';

const KIND_ICON: Record<LogEntry['kind'], string> = {
  system: '•',
  nomination: '👤',
  vote: '🗳',
  legislation: '📜',
  power: '⚡',
  win: '🏛',
};

export function GameLog({ log }: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="game-log">
      <div className="game-log-title">Riksdagsprotokoll</div>
      <div className="game-log-body">
        {log.map((e) => (
          <div key={e.id} className={`log-entry log-${e.kind}`}>
            <span className="log-round">R{e.round}</span>
            <span className="log-icon">{KIND_ICON[e.kind]}</span>
            <span className="log-text">{e.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
