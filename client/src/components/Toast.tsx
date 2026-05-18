import { useEffect } from 'react';
import { useStore } from '../store.js';

export function Toast() {
  const error = useStore((s) => s.error);
  const notice = useStore((s) => s.notice);
  const clearError = useStore((s) => s.clearError);

  useEffect(() => {
    if (error || notice) {
      const t = setTimeout(clearError, 4500);
      return () => clearTimeout(t);
    }
  }, [error, notice, clearError]);

  if (!error && !notice) return null;
  return (
    <div className={`toast ${error ? 'toast-error' : 'toast-notice'}`} onClick={clearError}>
      {error ?? notice}
    </div>
  );
}
