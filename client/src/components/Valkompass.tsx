import { useMemo, useState } from 'react';
import {
  ANSWER_OPTIONS,
  VALKOMPASS_QUESTIONS,
  scoreValkompass,
  getParty,
  type AnswerKey,
} from '@dos/shared';
import { useStore } from '../store.js';

export function Valkompass({ onClose }: { onClose: () => void }) {
  const submit = useStore((s) => s.submitValkompass);
  const setParty = useStore((s) => s.setParty);
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [index, setIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const total = VALKOMPASS_QUESTIONS.length;
  const question = VALKOMPASS_QUESTIONS[index];
  const answered = Object.keys(answers).length;

  const results = useMemo(
    () => (showResult ? scoreValkompass(answers) : []),
    [showResult, answers],
  );

  const choose = (key: AnswerKey) => {
    const next = { ...answers, [question.id]: key };
    setAnswers(next);
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      submit(next);
      setShowResult(true);
    }
  };

  if (showResult) {
    const top = results[0];
    const topParty = getParty(top.partyId);
    return (
      <div className="card valkompass">
        <h2>Din partimatchning</h2>
        <p className="muted">
          Utifrån dina svar passar du bäst med <strong>{topParty.name}</strong>. Du
          kan välja det partiet eller ett annat i lobbyn.
        </p>
        <ol className="vk-results">
          {results.map((r) => {
            const party = getParty(r.partyId);
            return (
              <li key={r.partyId}>
                <span className="vk-dot" style={{ background: party.color }} />
                <span className="vk-pname">{party.name}</span>
                <span className="vk-bar">
                  <span
                    className="vk-bar-fill"
                    style={{ width: `${r.percent}%`, background: party.color }}
                  />
                </span>
                <span className="vk-pct">{r.percent}%</span>
              </li>
            );
          })}
        </ol>
        <div className="row">
          <button
            className="btn btn-primary"
            onClick={() => {
              setParty(top.partyId);
              onClose();
            }}
          >
            Välj {topParty.shortName} och fortsätt
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Välj parti själv
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card valkompass">
      <div className="vk-head">
        <h2>Valkompass 2026</h2>
        <span className="muted">
          Fråga {index + 1} av {total}
        </span>
      </div>
      <div className="vk-progress">
        <div className="vk-progress-fill" style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      <p className="vk-topic">{question.topic}</p>
      <p className="vk-statement">”{question.statement}”</p>

      <div className="vk-options">
        {ANSWER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`btn vk-opt ${answers[question.id] === opt.key ? 'vk-opt-on' : ''}`}
            onClick={() => choose(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="row">
        <button
          className="btn btn-ghost"
          disabled={index === 0}
          onClick={() => setIndex(Math.max(0, index - 1))}
        >
          Föregående
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          Hoppa över
        </button>
      </div>
    </div>
  );
}
