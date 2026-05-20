import { useEffect } from 'react';
import { useV } from '../store.js';

const CONFETTI_COLORS = ['#d8b15a', '#4a9d6b', '#3a6fd6', '#c0504a', '#e0913f', '#7fa8d8'];

function Confetti() {
  return (
    <div className="confetti">
      {Array.from({ length: 40 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${Math.random() * 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${Math.random() * 0.4}s`,
            animationDuration: `${1.4 + Math.random() * 1.2}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ResultToast() {
  const result = useV((s) => s.lastResult);
  const clear = useV((s) => s.clearResult);

  useEffect(() => {
    if (result) {
      const t = setTimeout(clear, result.viral ? 3600 : 2400);
      return () => clearTimeout(t);
    }
  }, [result, clear]);

  if (!result) return null;
  return (
    <div className="v-result-overlay" onClick={clear}>
      {result.viral && <Confetti />}
      <div className={`v-result ${result.viral ? 'v-result-viral' : ''}`}>
        <div className="v-result-points">+{result.points}</div>
        <div className="v-result-text">{result.text}</div>
        {result.newAchievements.length > 0 && (
          <div className="v-result-ach">🏆 Ny utmärkelse upplåst!</div>
        )}
      </div>
    </div>
  );
}
