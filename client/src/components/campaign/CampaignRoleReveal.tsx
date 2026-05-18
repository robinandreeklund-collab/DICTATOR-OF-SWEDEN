import { useEffect, useState } from 'react';
import { getParty, type CampaignClientView } from '@dos/shared';
import { ROLE_DESC, ROLE_ICON, ROLE_LABEL, playerName } from '../../campaignLib.js';

export function CampaignRoleReveal({ view }: { view: CampaignClientView }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const team = view.teams.find((t) => t.id === view.you.teamId);
  if (!team || !view.you.role) return null;
  const party = getParty(team.partyId);
  const isMole = view.you.isMole;
  const role = view.you.role;
  const mates = team.memberIds.filter((id) => id !== view.you.id);

  return (
    <div className="reveal-overlay">
      <div
        className={`reveal-card ${open ? 'reveal-open' : ''} ${
          isMole ? 'reveal-antidemocrats' : 'reveal-democrats'
        }`}
      >
        {!open ? (
          <div className="reveal-front">
            <div className="reveal-seal">🗳</div>
            <p>Valrorelsen 2026 inleds…</p>
            <p className="muted">Ditt uppdrag delas ut</p>
          </div>
        ) : (
          <div className="reveal-back">
            <span className="reveal-team" style={{ color: party.color }}>
              {party.name}
            </span>
            <h1 className="reveal-role">
              {ROLE_ICON[role]} {ROLE_LABEL[role]}
            </h1>
            <p className="reveal-blurb">{ROLE_DESC[role]}</p>
            {isMole && (
              <p className="reveal-mole-warning">
                🕵 Du ar dessutom lagets hemliga <strong>mullvad</strong>. Du vinner
                om partiet hamnar i opposition — sabotera utan att avslojas.
              </p>
            )}
            {!isMole && (
              <p className="reveal-blurb small">
                Nagon i laget ar en mullvad som vill se er forlora. Hall ogonen
                oppna.
              </p>
            )}
            <div className="reveal-allies">
              <span>Ditt lag:</span>
              <ul>
                {mates.map((id) => (
                  <li key={id}>
                    {playerName(view, id)} — {ROLE_LABEL[team.roles[id]]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
