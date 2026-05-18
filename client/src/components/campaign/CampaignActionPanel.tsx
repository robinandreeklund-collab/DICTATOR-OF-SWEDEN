import { useState } from 'react';
import { Campaign, type CampaignClientView } from '@dos/shared';
import { useStore } from '../../store.js';
import { playerName } from '../../campaignLib.js';

export interface Alloc {
  focus: string[];
  visit: string | null;
  issue: string;
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

export function CampaignActionPanel({
  view,
  alloc,
  onAlloc,
}: {
  view: CampaignClientView;
  alloc: Alloc;
  onAlloc: (a: Alloc) => void;
}) {
  const send = useStore((s) => s.sendCampaignAction);
  const [sabotageChoice, setSabotageChoice] = useState(false);
  const myTeam = view.teams.find((t) => t.id === view.you.teamId);
  const vkName = (id: string) =>
    Campaign.VALKRETS_BY_ID[id]?.shortName ?? id;

  // --- kampanjfas ---
  if (view.phase === 'campaign') {
    const planDone = view.you.teamPlan?.submitted;
    const moleNeed =
      view.you.isMole &&
      myTeam?.moleStatus === 'hidden' &&
      !view.you.moleMove?.submitted;
    const spend = splitKassa(alloc.focus, Campaign.WEEKLY_KASSA);

    return (
      <div className="action-panel camp-action">
        {view.you.isLeader && !planDone && (
          <div className="camp-leader-form">
            <h3>Du leder kampanjen</h3>
            <p className="muted small">
              Valj valkretsar pa kartan (max 5). Kampanjkassan delas jamnt.
            </p>

            <div className="camp-issues">
              {Campaign.ISSUES.map((iss) => (
                <button
                  key={iss.id}
                  className={`btn btn-small camp-issue ${
                    alloc.issue === iss.id ? 'camp-issue-on' : ''
                  } ${iss.id === view.hotIssue ? 'camp-issue-hot' : ''}`}
                  onClick={() => onAlloc({ ...alloc, issue: iss.id })}
                >
                  {iss.label}
                  {iss.id === view.hotIssue && ' 🔥'}
                </button>
              ))}
            </div>

            <div className="camp-focus">
              {alloc.focus.length === 0 && (
                <span className="muted small">Inga valkretsar valda an.</span>
              )}
              {alloc.focus.map((id) => (
                <span key={id} className="camp-focus-chip">
                  {vkName(id)} · {spend[id]} kassa
                  <button
                    className="icon-btn"
                    onClick={() =>
                      onAlloc({
                        ...alloc,
                        focus: alloc.focus.filter((f) => f !== id),
                        visit: alloc.visit === id ? null : alloc.visit,
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {alloc.focus.length > 0 && (
              <div className="camp-visit">
                <span className="muted small">Partiledarbesok:</span>
                {alloc.focus.map((id) => (
                  <button
                    key={id}
                    className={`btn btn-small ${alloc.visit === id ? 'camp-visit-on' : ''}`}
                    onClick={() => onAlloc({ ...alloc, visit: id })}
                  >
                    {vkName(id)}
                  </button>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={alloc.focus.length === 0}
              onClick={() =>
                send({
                  type: 'SUBMIT_PLAN',
                  spend,
                  leaderVisit: alloc.visit,
                  issue: alloc.issue,
                })
              }
            >
              Las kampanjveckan
            </button>
          </div>
        )}

        {view.you.isLeader && planDone && (
          <p className="camp-locked">✓ Kampanjveckan ar last. Vantar pa ovriga lag…</p>
        )}

        {!view.you.isLeader && (
          <p className="muted">
            {playerName(view, myTeam?.leaderId ?? null)} planerar lagets vecka.
          </p>
        )}

        {moleNeed && (
          <div className="camp-mole-box">
            <h3>Hemligt mullvadsdrag</h3>
            <p className="small">
              Som mullvad kan du sabotera lagets kampanj denna vecka. Ingen ser
              vem som gjorde det.
            </p>
            <label className="ready-toggle">
              <input
                type="checkbox"
                checked={sabotageChoice}
                onChange={(e) => setSabotageChoice(e.target.checked)}
              />
              <span>Sabotera veckans kampanj</span>
            </label>
            <button
              className="btn btn-primary"
              onClick={() => send({ type: 'SUBMIT_MOLE', sabotage: sabotageChoice })}
            >
              Bekrafta hemligt drag
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- internt krismote ---
  if (view.phase === 'internal') {
    if (view.you.internalVoteCast) {
      return (
        <div className="action-panel camp-action">
          <p className="camp-locked">
            ✓ Du har pekat ut {playerName(view, view.you.internalVoteCast)}.
          </p>
        </div>
      );
    }
    const mates = (myTeam?.memberIds ?? []).filter((id) => id !== view.you.id);
    return (
      <div className="action-panel camp-action">
        <h3>Internt krismote</h3>
        <p>Vem i laget tror du ar mullvaden? En korrekt utpekning neutraliserar den.</p>
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

  return null;
}
