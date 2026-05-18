import { teamOf, type ClientGameView } from '@dos/shared';
import { ROLE_BLURB, ROLE_LABEL, TEAM_LABEL, playerName } from '../lib.js';

export function RoleCard({ g }: { g: ClientGameView }) {
  const role = g.you.role;
  if (!role) return null;
  const team = teamOf(role);

  return (
    <div className={`role-card role-${team}`}>
      <div className="role-card-head">
        <span className="role-card-team">{TEAM_LABEL[team]}</span>
        <span className="role-card-role">{ROLE_LABEL[role]}</span>
      </div>
      <p className="role-card-blurb">{ROLE_BLURB[role]}</p>
      {g.you.knownAllies.length > 0 && (
        <div className="role-allies">
          <span className="role-allies-label">Du känner till:</span>
          <ul>
            {g.you.knownAllies.map((a) => (
              <li key={a.id}>
                {playerName(g, a.id)} — <strong>{ROLE_LABEL[a.role]}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
