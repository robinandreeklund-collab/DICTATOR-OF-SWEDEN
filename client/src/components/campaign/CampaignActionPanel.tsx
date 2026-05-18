import { Campaign, getParty, type CampaignClientView, type RoleAction } from '@dos/shared';
import { useStore } from '../../store.js';
import { ROLE_ICON, ROLE_LABEL, REGION_LABEL, playerName, issueLabel } from '../../campaignLib.js';

export interface Draft {
  spend: string[];
  issue: string;
  debateTarget: string;
  crisisResponse: 'erkann' | 'forneka' | 'skyll';
  focus: 'bas' | 'marginal' | 'attack';
  attackTarget: string;
  analyzeTarget: string;
  insamlareChoice: 'fundraise' | 'annons' | 'skold';
  region: string;
  sabotage: boolean;
}

export function emptyDraft(view: CampaignClientView): Draft {
  const rivals = view.teams.filter((t) => t.id !== view.you.teamId);
  return {
    spend: [],
    issue: view.hotIssue ?? 'valfard',
    debateTarget: rivals[0]?.id ?? 'positiv',
    crisisResponse: 'erkann',
    focus: 'bas',
    attackTarget: rivals[0]?.id ?? '',
    analyzeTarget: rivals[0]?.id ?? view.you.teamId,
    insamlareChoice: 'fundraise',
    region: 'mellan',
    sabotage: false,
  };
}

export function splitKassa(focus: string[], total: number): Record<string, number> {
  const n = focus.length;
  if (n === 0) return {};
  const base = Math.floor(total / n);
  const rem = total - base * n;
  const out: Record<string, number> = {};
  focus.forEach((id, i) => {
    out[id] = base + (i < rem ? 1 : 0);
  });
  return out;
}

const REGIONS = ['norr', 'mellan', 'storstad', 'storstadslan', 'smaland', 'syd'];

export function CampaignActionPanel({
  view,
  draft,
  onDraft,
}: {
  view: CampaignClientView;
  draft: Draft;
  onDraft: (d: Draft) => void;
}) {
  const send = useStore((s) => s.sendCampaignAction);
  const myTeam = view.teams.find((t) => t.id === view.you.teamId);
  const role = view.you.role;
  const rivals = view.teams.filter((t) => t.id !== view.you.teamId);
  const set = (patch: Partial<Draft>) => onDraft({ ...draft, ...patch });
  const tag = (teamId: string) => {
    const t = view.teams.find((x) => x.id === teamId);
    return t ? getParty(t.partyId).shortName : teamId;
  };

  // --- internt krismote ---
  if (view.phase === 'internal') {
    if (view.you.internalVoteCast) {
      return (
        <div className="action-panel camp-action">
          <p className="camp-locked">
            ✓ Du pekade ut {playerName(view, view.you.internalVoteCast)}.
          </p>
        </div>
      );
    }
    const mates = (myTeam?.memberIds ?? []).filter((id) => id !== view.you.id);
    return (
      <div className="action-panel camp-action">
        <h3>Internt krismote</h3>
        <p>Vem i laget tror du ar mullvaden? En korrekt utpekning oskadliggor den.</p>
        <div className="target-picker">
          {mates.map((id) => (
            <button
              key={id}
              className="btn target-chip"
              onClick={() => send({ type: 'INTERNAL_VOTE', accusedId: id })}
            >
              {playerName(view, id)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view.phase !== 'planning' || !role || !myTeam) return null;

  if (view.you.submitted) {
    return (
      <div className="action-panel camp-action">
        <p className="camp-locked">✓ Ditt drag ar last. Vantar pa ovriga…</p>
        <p className="muted small">
          {myTeam.submittedCount}/{myTeam.memberIds.length} i laget klara.
        </p>
      </div>
    );
  }

  const submit = () => {
    let action: RoleAction;
    if (role === 'kampanjledare') {
      action = { role, spend: splitKassa(draft.spend, myTeam.kassa) };
    } else if (role === 'talesperson') {
      action = { role, issue: draft.issue, debateTarget: draft.debateTarget };
      if (view.crisisTeamId === myTeam.id) action.crisisResponse = draft.crisisResponse;
    } else if (role === 'strateg') {
      action =
        draft.focus === 'attack'
          ? { role, focus: 'attack', attackTarget: draft.attackTarget }
          : { role, focus: draft.focus };
    } else if (role === 'analytiker') {
      action = { role, analyzeTarget: draft.analyzeTarget };
    } else {
      action =
        draft.insamlareChoice === 'annons'
          ? { role, choice: 'annons', region: draft.region as never }
          : { role, choice: draft.insamlareChoice };
    }
    send({ type: 'SUBMIT_ROLE', action, sabotage: draft.sabotage });
  };

  const canSubmit =
    role !== 'kampanjledare' || draft.spend.length > 0;

  return (
    <div className="action-panel camp-action">
      <h3>
        {ROLE_ICON[role]} Du ar {ROLE_LABEL[role]}
      </h3>

      {role === 'kampanjledare' && (
        <KampanjledarePanel view={view} draft={draft} kassa={myTeam.kassa} />
      )}

      {role === 'talesperson' && (
        <>
          <p className="muted small">Valj sakfraga att driva och vem ni moter i debatt.</p>
          <div className="camp-issues">
            {Campaign.ISSUES.map((iss) => (
              <button
                key={iss.id}
                className={`btn btn-small camp-issue ${
                  draft.issue === iss.id ? 'camp-issue-on' : ''
                } ${iss.id === view.hotIssue ? 'camp-issue-hot' : ''}`}
                onClick={() => set({ issue: iss.id })}
              >
                {iss.label}
                {iss.id === view.hotIssue && ' 🔥'}
              </button>
            ))}
          </div>
          <p className="muted small">Debattmotstandare:</p>
          <div className="target-picker">
            <button
              className={`btn btn-small ${draft.debateTarget === 'positiv' ? 'camp-issue-on' : ''}`}
              onClick={() => set({ debateTarget: 'positiv' })}
            >
              Kor positiv kampanj
            </button>
            {rivals.map((t) => (
              <button
                key={t.id}
                className={`btn btn-small ${draft.debateTarget === t.id ? 'camp-issue-on' : ''}`}
                onClick={() => set({ debateTarget: t.id })}
              >
                Utmana {tag(t.id)}
              </button>
            ))}
          </div>
          {view.crisisTeamId === myTeam.id && (
            <div className="camp-crisis-box">
              <strong>⚠ Ert lag drabbas av veckans kris!</strong>
              <p className="small">{view.currentEvent?.body}</p>
              <div className="target-picker">
                {(['erkann', 'forneka', 'skyll'] as const).map((r) => (
                  <button
                    key={r}
                    className={`btn btn-small ${draft.crisisResponse === r ? 'camp-issue-on' : ''}`}
                    onClick={() => set({ crisisResponse: r })}
                  >
                    {r === 'erkann' ? 'Erkann & be om ursakt' : r === 'forneka' ? 'Forneka allt' : 'Skyll pa motstandarna'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {role === 'strateg' && (
        <>
          <p className="muted small">Satt veckans strategi.</p>
          <div className="target-picker">
            {(['bas', 'marginal', 'attack'] as const).map((f) => (
              <button
                key={f}
                className={`btn btn-small ${draft.focus === f ? 'camp-issue-on' : ''}`}
                onClick={() => set({ focus: f })}
              >
                {f === 'bas' ? 'Mobilisera basen' : f === 'marginal' ? 'Vinn marginalvalkretsar' : 'Angrip ett lag'}
              </button>
            ))}
          </div>
          {draft.focus === 'attack' && (
            <>
              <p className="muted small">Vilket lag ska ni angripa?</p>
              <div className="target-picker">
                {rivals.map((t) => (
                  <button
                    key={t.id}
                    className={`btn btn-small ${draft.attackTarget === t.id ? 'camp-issue-on' : ''}`}
                    onClick={() => set({ attackTarget: t.id })}
                  >
                    {tag(t.id)}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {role === 'analytiker' && (
        <>
          <p className="muted small">
            Analysera ett lag — ni far underrattelser och kan upptacka sabotage.
          </p>
          <div className="target-picker">
            {view.teams.map((t) => (
              <button
                key={t.id}
                className={`btn btn-small ${draft.analyzeTarget === t.id ? 'camp-issue-on' : ''}`}
                onClick={() => set({ analyzeTarget: t.id })}
              >
                {tag(t.id)}
                {t.id === myTeam.id && ' (eget lag)'}
              </button>
            ))}
          </div>
        </>
      )}

      {role === 'insamlare' && (
        <>
          <p className="muted small">Skot lagets ekonomi den har veckan.</p>
          <div className="target-picker">
            {(['fundraise', 'annons', 'skold'] as const).map((c) => (
              <button
                key={c}
                className={`btn btn-small ${draft.insamlareChoice === c ? 'camp-issue-on' : ''}`}
                onClick={() => set({ insamlareChoice: c })}
              >
                {c === 'fundraise' ? 'Samla in pengar' : c === 'annons' ? 'Annonskampanj' : 'Skolda laget'}
              </button>
            ))}
          </div>
          {draft.insamlareChoice === 'annons' && (
            <>
              <p className="muted small">I vilken region?</p>
              <div className="target-picker">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    className={`btn btn-small ${draft.region === r ? 'camp-issue-on' : ''}`}
                    onClick={() => set({ region: r })}
                  >
                    {REGION_LABEL[r]}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view.you.isMole && (
        <div className="camp-mole-box">
          <strong>🕵 Hemligt mullvadsdrag</strong>
          <label className="ready-toggle">
            <input
              type="checkbox"
              checked={draft.sabotage}
              onChange={(e) => set({ sabotage: e.target.checked })}
            />
            <span>Sabotera ditt drag denna vecka</span>
          </label>
        </div>
      )}

      <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
        Las ditt drag
      </button>
      {!canSubmit && (
        <p className="muted small">Valj minst en valkrets pa kartan.</p>
      )}
    </div>
  );
}

function KampanjledarePanel({
  view,
  draft,
  kassa,
}: {
  view: CampaignClientView;
  draft: Draft;
  kassa: number;
}) {
  const spend = splitKassa(draft.spend, kassa);
  return (
    <>
      <p className="muted small">
        Klicka pa valkretsar pa kartan. Kassan ({Math.round(kassa)}) delas jamnt.
      </p>
      <div className="camp-focus">
        {draft.spend.length === 0 && (
          <span className="muted small">Inga valkretsar valda an.</span>
        )}
        {draft.spend.map((id) => (
          <span key={id} className="camp-focus-chip">
            {Campaign.VALKRETS_BY_ID[id]?.shortName ?? id} · {spend[id]}
          </span>
        ))}
      </div>
      <p className="muted small">Het fraga denna vecka: {issueLabel(view.hotIssue ?? '')}</p>
    </>
  );
}
