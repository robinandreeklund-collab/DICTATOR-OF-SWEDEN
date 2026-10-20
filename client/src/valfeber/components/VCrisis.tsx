import { useState } from 'react';
import { useV } from '../store.js';
import type { CrisisStep } from '../api.js';

const STEP_ORDER: CrisisStep[] = ['statement', 'press', 'close'];
const STEP_LABEL: Record<CrisisStep, string> = {
  statement: 'Första uttalandet',
  press: 'Pressträffen',
  close: 'Avslutande drag',
};
const ARCH_ICON: Record<string, string> = {
  fornekande: '🙅',
  erkannande: '🙇',
  offensiv: '⚡',
};
const ARCH_COLOR: Record<string, string> = {
  fornekande: '#93a0b8',
  erkannande: '#4a9d6b',
  offensiv: '#c0504a',
};

export function VCrisis({ onClose }: { onClose: () => void }) {
  const doAction = useV((s) => s.doAction);
  const busy = useV((s) => s.busy);
  const state = useV((s) => s.state)!;
  const script = state.crisis;
  const event = state.event;

  const [picks, setPicks] = useState<Partial<Record<CrisisStep, string>>>({});

  const currentStepIdx = STEP_ORDER.findIndex((s) => !picks[s]);
  const currentStep: CrisisStep | null = currentStepIdx >= 0 ? STEP_ORDER[currentStepIdx] : null;
  const done = currentStep === null;

  const pick = (step: CrisisStep, choiceId: string) => {
    setPicks((p) => ({ ...p, [step]: choiceId }));
  };

  const submit = async () => {
    if (!done) return;
    await doAction('crisis', { crisisChoices: picks });
    onClose();
  };

  const currentPack = currentStep ? script[currentStep] : null;

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div className="v-modal v-crisis" onClick={(e) => e.stopPropagation()}>
        <h2>⚠ Krishantering</h2>

        <div className="v-crisis-news">
          <strong>{event.title}</strong>
          <p className="small">{event.body}</p>
          <span className="muted small">Källa: {event.source}</span>
        </div>

        <div className="v-crisis-timeline">
          {STEP_ORDER.map((s, i) => {
            const picked = picks[s];
            const choice = picked ? script[s].choices.find((c) => c.id === picked) : null;
            const active = currentStep === s;
            return (
              <div
                key={s}
                className={`v-crisis-step ${picked ? 'v-cs-done' : ''} ${active ? 'v-cs-active' : ''}`}
              >
                <div className="v-cs-num">{i + 1}</div>
                <div className="v-cs-info">
                  <div className="v-cs-label">{STEP_LABEL[s]}</div>
                  {choice && (
                    <div className="v-cs-pick" style={{ color: ARCH_COLOR[choice.archetype] }}>
                      {ARCH_ICON[choice.archetype]} {choice.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {currentPack && currentStep && (
          <div className="v-crisis-stage">
            <p className="v-crisis-prompt">{currentPack.prompt}</p>
            <div className="v-crisis-choices">
              {currentPack.choices.map((c) => (
                <button
                  key={c.id}
                  className="v-crisis-choice"
                  style={{ borderLeftColor: ARCH_COLOR[c.archetype] }}
                  onClick={() => pick(currentStep, c.id)}
                >
                  <span className="v-cc-head">
                    <span className="v-cc-icon">{ARCH_ICON[c.archetype]}</span>
                    <strong>{c.label}</strong>
                  </span>
                  <span className="v-cc-blurb">"{c.blurb}"</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {done && (
          <>
            <p className="muted small">
              Konsekvent linje genom alla tre steg ger starkast resultat. Ditt partis stil och om du äger dagens fråga påverkar också.
            </p>
            <button className="btn btn-primary btn-big" disabled={busy} onClick={submit}>
              Lås krishanteringen
            </button>
          </>
        )}
        <button className="btn btn-ghost" onClick={onClose}>Avbryt</button>
      </div>
    </div>
  );
}
