import { useEffect, useRef, useState } from 'react';
import { getParty } from '@dos/shared';
import { useV } from '../store.js';
import type { DebateResponseType, DebateView } from '../api.js';

const RESPONSE_ICON: Record<DebateResponseType, string> = {
  fakta: '📊',
  kansla: '❤️',
  motangrepp: '⚔️',
};
const RESPONSE_LABEL: Record<DebateResponseType, string> = {
  fakta: 'Fakta',
  kansla: 'Känsla',
  motangrepp: 'Motangrepp',
};

const ROUND_SECONDS = 15;

export function VDebate({ debate, onClose }: { debate: DebateView; onClose: () => void }) {
  const doAction = useV((s) => s.doAction);
  const lastResult = useV((s) => s.lastResult);
  const clearResult = useV((s) => s.clearResult);
  const myPartyId = useV((s) => s.state?.you.partyId) ?? null;

  const [phase, setPhase] = useState<'intro' | 'play' | 'submitting' | 'reveal'>('intro');
  const [round, setRound] = useState(0);
  const answersRef = useRef<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [lastPick, setLastPick] = useState<number | null>(null);
  const [meter, setMeter] = useState(50);
  const [revealIdx, setRevealIdx] = useState(-1);

  const opponent = getParty(debate.opponentPartyId);
  const me = myPartyId ? getParty(myPartyId) : null;
  const current = debate.rounds[round];

  // Starta rundan nar vi hamnar i play eller gar till nasta runda.
  useEffect(() => {
    if (phase !== 'play') return;
    setTimeLeft(ROUND_SECONDS);
    setLastPick(null);
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          pick(0, true); // timeout -> ta forsta alternativet
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const pick = (idx: number, timeout = false) => {
    if (phase !== 'play') return;
    setLastPick(idx);
    answersRef.current = [...answersRef.current, idx];
    // Visa valet 500 ms innan vi gar vidare for att det ska kannas som ett slag.
    setTimeout(
      () => {
        if (answersRef.current.length >= 4) {
          setPhase('submitting');
          doAction('debate', { answers: answersRef.current });
        } else {
          setRound((r) => r + 1);
        }
      },
      timeout ? 100 : 600,
    );
  };

  // Nar servern svarat med debattresultat, kor den dramatiska avslojningen.
  useEffect(() => {
    if (phase !== 'submitting' || !lastResult?.debate) return;
    setPhase('reveal');
    setRevealIdx(-1);
    setMeter(50);
    const swings = lastResult.debate.swings;
    swings.forEach((swing, i) => {
      setTimeout(() => {
        setRevealIdx(i);
        setMeter((m) => Math.max(0, Math.min(100, m + swing)));
      }, 700 + i * 1200);
    });
  }, [phase, lastResult]);

  const finish = () => {
    clearResult();
    onClose();
  };

  // --- Intro ---
  if (phase === 'intro') {
    return (
      <div className="v-modal-overlay" onClick={() => undefined}>
        <div className="v-modal v-debate v-debate-intro">
          <div className="v-debate-vs">
            {me && (
              <div className="v-debate-side v-debate-left" style={{ borderColor: me.color }}>
                <div className="v-party-mark" style={{ background: me.color }}>{me.shortName}</div>
                <div>Du ({me.name})</div>
              </div>
            )}
            <div className="v-vs">VS</div>
            <div className="v-debate-side v-debate-right" style={{ borderColor: opponent.color }}>
              <div className="v-party-mark" style={{ background: opponent.color }}>{opponent.shortName}</div>
              <div>{opponent.leader}</div>
              <div className="muted small">{opponent.name}</div>
            </div>
          </div>
          <p className="v-debate-rules">
            4 rundor. Välj svartaktik — <strong>Fakta 📊</strong>, <strong>Känsla ❤️</strong>, eller <strong>Motangrepp ⚔️</strong>.
            Rätt motsvarighet vinner publiken. 15 sek per runda.
          </p>
          <button className="btn btn-primary btn-big" onClick={() => setPhase('play')}>
            Starta debatten
          </button>
          <button className="btn btn-ghost" onClick={finish}>Avbryt</button>
        </div>
      </div>
    );
  }

  // --- Submitting (kort loader) ---
  if (phase === 'submitting') {
    return (
      <div className="v-modal-overlay">
        <div className="v-modal v-debate v-debate-wait">
          <div className="action-spinner" /> Publiken funderar…
        </div>
      </div>
    );
  }

  // --- Reveal ---
  if (phase === 'reveal' && lastResult?.debate) {
    const result = lastResult.debate;
    return (
      <div className="v-modal-overlay">
        <div className="v-modal v-debate v-debate-reveal">
          <h2>{result.wins >= 3 ? '🏆 Debattseger' : result.wins === 2 ? '⚖ Oavgjort' : '💔 Debattförlust'}</h2>
          <DebateMeter value={meter} me={me} opponent={opponent} />
          <ol className="v-debate-rounds">
            {debate.rounds.map((r, i) => {
              const shown = i <= revealIdx;
              const swing = result.swings[i] ?? 0;
              const picked = answersRef.current[i];
              const pickedResp = r.responses[picked];
              const bestResp = r.responses[result.bestResponseIndex[i]];
              const correct = swing > 0;
              return (
                <li key={r.id} className={`v-debate-round-row ${shown ? 'v-shown' : ''}`}>
                  <span className="v-dr-num">R{i + 1}</span>
                  <span className="v-dr-pick">
                    {pickedResp && (
                      <>
                        {RESPONSE_ICON[pickedResp.type]} {RESPONSE_LABEL[pickedResp.type]}
                      </>
                    )}
                  </span>
                  <span className={`v-dr-swing ${correct ? 'v-up' : 'v-down'}`}>
                    {swing >= 0 ? '+' : ''}{swing}
                  </span>
                  {shown && !correct && bestResp && (
                    <span className="v-dr-best muted small">
                      Bäst: {RESPONSE_ICON[bestResp.type]} {RESPONSE_LABEL[bestResp.type]}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="v-debate-score">
            Slutresultat: <strong>{result.score}</strong> · {result.wins} av 4 rätta
          </p>
          <p className="v-result-points">+{lastResult.points} poäng</p>
          <button className="btn btn-primary btn-big" onClick={finish} disabled={revealIdx < result.swings.length - 1}>
            {revealIdx < result.swings.length - 1 ? 'Räknar publiken…' : 'Fortsätt'}
          </button>
        </div>
      </div>
    );
  }

  // --- Play ---
  const progress = (timeLeft / ROUND_SECONDS) * 100;
  return (
    <div className="v-modal-overlay">
      <div className="v-modal v-debate v-debate-play">
        <div className="v-debate-head">
          <span>
            Runda <strong>{round + 1}</strong> av 4 · mot {opponent.leader} ({opponent.shortName})
          </span>
          <span className="v-debate-timer">{timeLeft}s</span>
        </div>
        <div className="v-debate-progress"><div style={{ width: `${progress}%` }} /></div>

        <div className="v-debate-bubble v-debate-them" style={{ borderColor: opponent.color }}>
          <div className="v-debate-who">
            <span className="v-party-mark" style={{ background: opponent.color }}>{opponent.shortName}</span>
            {opponent.leader}
          </div>
          <p>{current.text}</p>
        </div>

        <div className="v-debate-choices">
          {current.responses.map((r, i) => (
            <button
              key={i}
              className={`v-debate-choice ${lastPick === i ? 'v-dc-picked' : ''}`}
              disabled={lastPick !== null}
              onClick={() => pick(i)}
            >
              <span className="v-dc-icon">{RESPONSE_ICON[r.type]}</span>
              <span className="v-dc-type">{RESPONSE_LABEL[r.type]}</span>
              <span className="v-dc-text">"{r.text}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DebateMeter({ value, me, opponent }: { value: number; me: { color: string } | null; opponent: { color: string } }) {
  const myColor = me?.color ?? '#3a6fd6';
  return (
    <div className="v-debate-meter">
      <div className="v-dm-label v-dm-left">{opponent.color && 'Motståndaren'}</div>
      <div className="v-dm-bar">
        <div className="v-dm-fill v-dm-fill-them" style={{ width: `${100 - value}%`, background: opponent.color }} />
        <div className="v-dm-fill v-dm-fill-me" style={{ width: `${value}%`, background: myColor }} />
        <div className="v-dm-marker">
          <span className="v-dm-value">{Math.round(value)}</span>
        </div>
      </div>
      <div className="v-dm-label v-dm-right">Du</div>
    </div>
  );
}
