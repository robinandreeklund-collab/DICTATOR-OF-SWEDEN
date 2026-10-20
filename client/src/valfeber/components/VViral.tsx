import { useState } from 'react';
import { getParty } from '@dos/shared';
import { useV } from '../store.js';
import type { Angle, Emotion, PostFormat } from '../api.js';

const EMOTIONS: Emotion[] = ['hopp', 'oro', 'humor'];
const ANGLES: Angle[] = ['loften', 'attack', 'personligt'];
const FORMATS: PostFormat[] = ['bildcitat', 'video', 'trad'];

const EMO_META: Record<Emotion, { icon: string; label: string; hint: string }> = {
  hopp:  { icon: '🌅', label: 'Hopp',  hint: 'Framtidstro, lösningar' },
  oro:   { icon: '⚠️', label: 'Oro',   hint: 'Varna, påpeka risker' },
  humor: { icon: '😄', label: 'Humor', hint: 'Driv, ironi, roligt' },
};
const ANG_META: Record<Angle, { icon: string; label: string; hint: string }> = {
  loften:     { icon: '📜', label: 'Löfte',       hint: 'Vad du ska leverera' },
  attack:     { icon: '⚔️', label: 'Attack',      hint: 'Peka ut motståndaren' },
  personligt: { icon: '💭', label: 'Personligt',  hint: 'Egen berättelse' },
};
const FMT_META: Record<PostFormat, { icon: string; label: string; hint: string }> = {
  bildcitat: { icon: '🖼', label: 'Bildcitat', hint: 'Stort citat över bild' },
  video:     { icon: '📹', label: 'Video',     hint: 'Kort klipp till kameran' },
  trad:      { icon: '🧵', label: 'Tråd',      hint: 'Flera inlägg efter varandra' },
};

function postPreview(partyName: string, e: Emotion, a: Angle, f: PostFormat, hotIssueLabel: string): string {
  // Enkel mallbaserad forhandsvisning – bara flavor, inget poangsatt.
  const topic = hotIssueLabel.toLowerCase();
  const emoFrame =
    e === 'hopp'  ? 'Sverige kan ta sig an' :
    e === 'oro'   ? 'Vi måste prata om'    :
                    'Alla pratar om';
  const anglePart =
    a === 'loften'     ? `– och ${partyName} lovar att leverera.`
    : a === 'attack'   ? `– medan andra bara sitter stilla.`
    :                    `– jag mötte en familj i Göteborg som drabbats.`;
  const formatPrefix =
    f === 'bildcitat' ? '"'
    : f === 'video'   ? '📹 LIVE: '
    :                    '1/4 ';
  const formatSuffix = f === 'bildcitat' ? '"' : '';
  return `${formatPrefix}${emoFrame} ${topic} ${anglePart}${formatSuffix}`;
}

export function VViral({ onClose }: { onClose: () => void }) {
  const doAction = useV((s) => s.doAction);
  const busy = useV((s) => s.busy);
  const state = useV((s) => s.state)!;
  const [emotion, setEmotion] = useState<Emotion>('hopp');
  const [angle, setAngle] = useState<Angle>('loften');
  const [format, setFormat] = useState<PostFormat>('bildcitat');

  const party = state.you.partyId ? getParty(state.you.partyId) : null;
  const hotIssueLabel = state.event?.hotIssue ?? 'frågan';
  const previewText = party
    ? postPreview(party.name, emotion, angle, format, hotIssueLabel)
    : '';

  const submit = async () => {
    await doAction('viral', { emotion, angle, format });
    onClose();
  };

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div className="v-modal v-viral" onClick={(e) => e.stopPropagation()}>
        <h2>📱 Skriv viral post</h2>
        <p className="muted small">
          Varje parti har sin ton. Hitta kombinationen som funkar för dig – och dagens heta fråga ger extra skjuts om du driver den.
        </p>

        <ChoiceRow label="Känsla" value={emotion} options={EMOTIONS} meta={EMO_META} onChange={setEmotion} />
        <ChoiceRow label="Vinkel" value={angle} options={ANGLES} meta={ANG_META} onChange={setAngle} />
        <ChoiceRow label="Format" value={format} options={FORMATS} meta={FMT_META} onChange={setFormat} />

        {party && (
          <div className="v-viral-preview" style={{ borderColor: party.color }}>
            <div className="v-viral-head">
              <span className="v-party-mark" style={{ background: party.color }}>{party.shortName}</span>
              <div>
                <strong>{party.leader}</strong>
                <div className="muted small">@{party.id} · nu</div>
              </div>
            </div>
            <p className="v-viral-body">{previewText}</p>
            <div className="v-viral-stats">
              <span>💬 {Math.floor(Math.random() * 90)}</span>
              <span>🔁 {Math.floor(Math.random() * 400)}</span>
              <span>❤️ {Math.floor(Math.random() * 2000)}</span>
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-big" disabled={busy} onClick={submit}>
          Posta inlägget
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Avbryt</button>
      </div>
    </div>
  );
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  meta,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  meta: Record<T, { icon: string; label: string; hint: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="v-viral-row">
      <div className="v-viral-label">{label}</div>
      <div className="v-viral-choices">
        {options.map((o) => {
          const m = meta[o];
          const selected = value === o;
          return (
            <button
              key={o}
              className={`v-viral-choice ${selected ? 'v-vc-on' : ''}`}
              onClick={() => onChange(o)}
            >
              <span className="v-vc-icon">{m.icon}</span>
              <span className="v-vc-label">{m.label}</span>
              <span className="v-vc-hint">{m.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
