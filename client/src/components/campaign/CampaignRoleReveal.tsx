import { useEffect, useState } from 'react';
import { getParty, type CampaignClientView } from '@dos/shared';
import { playerName } from '../../campaignLib.js';

export function CampaignRoleReveal({ view }: { view: CampaignClientView }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const team = view.teams.find((t) => t.id === view.you.teamId);
  if (!team) return null;
  const party = getParty(team.partyId);
  const isMole = view.you.isMole;
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
            <h1 className="reveal-role">{isMole ? 'Mullvad' : 'Trogen kampanjarbetare'}</h1>
            <p className="reveal-blurb">
              {isMole
                ? 'Du ar i hemlighet kopt av motstandarna. Sabotera ditt lags kampanj sa att partiet hamnar i opposition - utan att bli avslojad.'
                : 'Du kampar for att ditt parti ska sitta i regering efter valet. Men nagon i laget ar en mullvad. Hitta den.'}
            </p>
            <div className="reveal-allies">
              <span>Ditt lag:</span>
              <ul>
                {mates.map((id) => (
                  <li key={id}>{playerName(view, id)}</li>
                ))}
              </ul>
            </div>
            <p className="muted small">Kampanjen borjar strax…</p>
          </div>
        )}
      </div>
    </div>
  );
}
