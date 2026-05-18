import { useEffect, useState } from 'react';
import { Campaign, getParty, type CampaignClientView } from '@dos/shared';
import { useStore } from '../store.js';
import { CAMPAIGN_PHASE_LABEL } from '../campaignLib.js';
import { SwedenMap } from '../components/campaign/SwedenMap.js';
import { RiksdagArc } from '../components/campaign/RiksdagArc.js';
import { PollBars } from '../components/campaign/PollBars.js';
import { CampaignActionPanel, type Alloc } from '../components/campaign/CampaignActionPanel.js';
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

  const [alloc, setAlloc] = useState<Alloc>({ focus: [], visit: null, issue: 'valfard' });
  const [inspectId, setInspectId] = useState<string | null>(null);

  // Nollstall kampanjval nar en ny vecka borjar.
  useEffect(() => {
    setAlloc({ focus: [], visit: null, issue: view.hotIssue ?? 'valfard' });
  }, [view.week, view.hotIssue]);

  if (view.phase === 'roleReveal') return <CampaignRoleReveal view={view} />;
  if (view.phase === 'gameOver') return <CampaignGameOver view={view} isHost={isHost} />;

  const myTeam = view.teams.find((t) => t.id === view.you.teamId);
  const allocActive =
    view.phase === 'campaign' && view.you.isLeader && !view.you.teamPlan?.submitted;

  const onMapSelect = (id: string) => {
    if (allocActive) {
      setAlloc((a) => {
        if (a.focus.includes(id)) {
          return {
            ...a,
            focus: a.focus.filter((f) => f !== id),
            visit: a.visit === id ? null : a.visit,
          };
        }
        if (a.focus.length >= 5) return a;
        return { ...a, focus: [...a.focus, id] };
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
          <span
            className="camp-team-pill"
            style={{ borderColor: getParty(myTeam.partyId).color }}
          >
            Ditt lag: {getParty(myTeam.partyId).name}
            {view.you.isLeader && ' · lagledare'}
            {view.you.isMole && ' · 🕵 mullvad'}
          </span>
        )}
      </header>

      {view.currentEvent && (
        <div className={`news-banner ${view.phase === 'news' ? 'news-big' : ''}`}>
          <span className="news-eyebrow">Nyhetscykeln · het fraga</span>
          <strong>{view.currentEvent.title}</strong>
          <p>{view.currentEvent.body}</p>
          <span className="news-source">Kalla: {view.currentEvent.source}</span>
        </div>
      )}

      <div className="camp-body">
        <div className="camp-map-col">
          <SwedenMap view={view} selectedId={inspectId} onSelect={onMapSelect} />
          {allocActive && (
            <p className="camp-map-hint">
              Klicka pa valkretsar for att satsa kampanjkassa (max 5).
            </p>
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
                        <span
                          className="poll-tag"
                          style={{ background: getParty(party).color }}
                        >
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
          <CampaignActionPanel view={view} alloc={alloc} onAlloc={setAlloc} />
        </div>

        <aside className="camp-side-col">
          {myTeam && (
            <Chat
              messages={snapshot.teamChat}
              meId={meId}
              variant="team"
              title={`Lagchatt · ${getParty(myTeam.partyId).shortName}`}
            />
          )}
          <Chat messages={snapshot.chat} meId={meId} title="Allman debatt" />
          <div className="game-log">
            <div className="game-log-title">Kampanjlogg</div>
            <div className="game-log-body">
              {view.log.slice(-40).map((e) => (
                <div key={e.id} className={`log-entry log-${e.kind}`}>
                  <span className="log-round">V{e.week}</span>
                  <span className="log-text">{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
