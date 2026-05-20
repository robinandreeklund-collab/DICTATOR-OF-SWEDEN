import { useEffect } from 'react';
import { useV } from './store.js';
import { VAuth } from './screens/VAuth.js';
import { VOnboarding } from './screens/VOnboarding.js';
import { VDashboard } from './screens/VDashboard.js';
import { VElection } from './screens/VElection.js';
import { ResultToast } from './components/ResultToast.js';

export function ValfeberApp() {
  const booted = useV((s) => s.booted);
  const token = useV((s) => s.token);
  const state = useV((s) => s.state);
  const error = useV((s) => s.error);
  const clearError = useV((s) => s.clearError);
  const boot = useV((s) => s.boot);
  const refresh = useV((s) => s.refresh);

  useEffect(() => {
    boot();
  }, [boot]);

  // Liveuppdatering av den delade varlden.
  useEffect(() => {
    if (!token || !state || state.world.electionOver) return;
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [token, state, refresh]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 4000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  let body;
  if (!booted) {
    body = <div className="v-loading">Laddar Valfeber 2026…</div>;
  } else if (!token || !state) {
    body = <VAuth />;
  } else if (!state.you.partyId) {
    body = <VOnboarding />;
  } else if (state.world.electionOver) {
    body = <VElection />;
  } else {
    body = <VDashboard />;
  }

  return (
    <div className="valfeber">
      {body}
      {error && (
        <div className="toast toast-error" onClick={clearError}>
          {error}
        </div>
      )}
      <ResultToast />
    </div>
  );
}
