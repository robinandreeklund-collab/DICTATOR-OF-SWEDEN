import { useEffect, useState } from 'react';
import { Campaign, getParty, type CampaignClientView } from '@dos/shared';
import { useStore } from '../store.js';
import { CAMPAIGN_PHASE_LABEL, ROLE_ICON, ROLE_LABEL } from '../campaignLib.js';
import { SwedenMap } from '../components/campaign/SwedenMap.js';
import { RiksdagArc } from '../components/campaign/RiksdagArc.js';
import { PollBars } from '../components/campaign/PollBars.js';
import {
  CampaignActionPanel,
  emptyDraft,
  type Draft,
} from '../components/campaign/CampaignActionPanel.js';
import { CampaignRoleReveal } from '../components/campaign/CampaignRoleReveal.js';
import { WeeklyResult } from '../components/campaign/WeeklyResult.js';
import { ElectionNight } from '../components/campaign/ElectionNight.js';
import { CampaignGameOver } from '../components/campaign/CampaignGameOver.js';
import { Chat } from '../components/Chat.js';

export function CampaignGame() {
  const snapshot = useStore((s) => s.snapshot)!;
  const view = snapshot.game as CampaignClientView;
  const meId = snapshot.you.id;
  const isHost = snapshot.you.isHost;

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(view));
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(emptyDraft(view));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.week]);

  if (view.phase === 'roleReveal') return <CampaignRoleReveal view={view} />;
  if (view.phase === 'gameOver') return <CampaignGameOver view={view} isHost={isHost} />;

  const myTeam = view.teams.find((t) => t.id === view.you.teamId);
  const allocMode =
    view.phase === 'planning' && view.you.role === 'kampanjledare' && !view.you.submitted;

  const onMapSelect = (id: string) => {
    if (allocMode) {
      setDraft((d) => {
        if (d.spend.includes(id)) return { ...d, spend: d.spend.filter((x) => x !== id) };
        if (d.spend.length >= 6) return d;
        return { ...d, spend: [...d.spend, id] };
      });
    }
    setInspectId(id);
  };

  const inspectVk = inspectId ? Campaign.VALKRETS_BY_ID[inspectId] : null;
  const inspectState = inspectId
    ? view.valkretsar.find((v) => v.id === inspectId)
    : null;

  return (
    <div className="campaign">
      {view.phase === 'electionNight' && <ElectionNight view={view} />}
      {view.phase === 'resolution' && <WeeklyResult view={view} />}

      <header className="camp-head">
        <div className="camp-head-main">
          <h1>Valrorelsen 2026</h1>
          <span className="phase-pill">
            Vecka {Math.min(view.week, view.totalWeeks)}/{view.totalWeeks} ·{' '}
            {CAMPAIGN_PHASE_LABEL[view.phase]}
          </span>
        </div>
        {myTeam && (
          <span className="camp-team-pill" style={{ borderColor: getParty(myTeam.partyId).color }}>
            {getParty(myTeam.partyId).name}
            {view.you.role && ` · ${ROLE_ICON[view.you.role]} ${ROLE_LABEL[view.you.role]}`}
            {view.you.isMole && ' · 🕵 mullvad'}
          </span>
        )}
      </header>

      {view.currentEvent && (
        <div
          className={`news-banner ${view.phase === 'news' ? 'news-big' : ''} ${
            view.crisisTeamId ? 'news-crisis' : ''
          }`}
        >
          <span className="news-eyebrow">
            {view.crisisTeamId ? 'Kris i valrorelsen' : 'Nyhetscykeln · het fraga'}
          </span>
          <strong>{view.currentEvent.title}</strong>
          <p>{view.currentEvent.body}</p>
          <span className="news-source">Kalla: {view.currentEvent.source}</span>
        </div>
      )}

      <div className="camp-body">
        <div className="camp-map-col">
          <SwedenMap view={view} selectedId={inspectId} onSelect={onMapSelect} />
          {allocMode && (
            <p className="camp-map-hint">Klicka pa valkretsar for att satsa kassa (max 6).</p>
          )}
          {inspectVk && inspectState && (
            <div className="vk-inspect">
              <strong>{inspectVk.name}</strong>
              <span className="muted small">{inspectVk.mandate} mandat</span>
              <div className="vk-inspect-bars">
                {Object.entries(inspectState.support)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([party, val]) => {
                    const total = Object.values(inspectState.support).reduce(
                      (x, y) => x + y,
                      0,
                    );
                    return (
                      <div key={party} className="vk-inspect-row">
                        <span className="poll-tag" style={{ background: getParty(party).color }}>
                          {getParty(party).shortName}
                        </span>
                        <span>{((val / total) * 100).toFixed(1)}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="camp-center-col">
          <RiksdagArc
            projection={view.projection}
            redgron={view.redgronMandate}
            tido={view.tidoMandate}
          />
          <PollBars projection={view.projection} />
          <CampaignActionPanel view={view} draft={draft} onDraft={setDraft} />
        </div>

        <aside className="camp-side-col">
          {myTeam && <TeamRoster view={view} />}
          {myTeam && (
            <Chat
              messages={snapshot.teamChat}
              meId={meId}
              variant="team"
              title={`Lagchatt · ${getParty(myTeam.partyId).shortName}`}
            />
          )}
          <Chat messages={snapshot.chat} meId={meId} title="Allman debatt" />
        </aside>
      </div>
    </div>
  );
}

function TeamRoster({ view }: { view: CampaignClientView }) {
  const team = view.teams.find((t) => t.id === view.you.teamId)!;
  const planning = view.phase === 'planning';
  return (
    <div className="team-roster">
      <div className="roster-head">
        <strong>Ditt lag</strong>
        {planning && (
          <span className="roster-stats">
            {team.submittedCount}/{team.memberIds.length} klara
          </span>
        )}
      </div>
      <div className="roster-stats-row">
        <span title="Kampanjkassa">💰 {team.kassa}</span>
        <span title="Momentum">⚡ {team.momentum >= 0 ? '+' : ''}{team.momentum}</span>
        <span title="Lagmoral">🙂 {Math.round(team.morale * 100)}%</span>
      </div>
      <ul className="roster-list">
        {team.memberIds.map((id) => {
          const p = view.players.find((x) => x.id === id)!;
          return (
            <li key={id}>
              <span className="roster-role">{ROLE_ICON[team.roles[id]]}</span>
              <span className="roster-name">
                {p.name}
                {id === view.you.id && <em> (du)</em>}
              </span>
              <span className="roster-rolename">{ROLE_LABEL[team.roles[id]]}</span>
              {planning && id === view.you.id && view.you.submitted && (
                <span className="roster-done">✓</span>
              )}
            </li>
          );
        })}
      </ul>
      {view.you.teamIntel.length > 0 && (
        <div className="roster-intel">
          <strong>Underrattelser</strong>
          {view.you.teamIntel.slice(-4).map((e, i) => (
            <p key={i} className="small">{e.text}</p>
          ))}
        </div>
      )}
      {team.moleStatus === 'exposed' && (
        <p className="roster-mole">🕵 Mullvaden i laget ar avslojad.</p>
      )}
    </div>
  );
}
