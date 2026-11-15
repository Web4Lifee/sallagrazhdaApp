import { useCallback, useState } from 'react';

import { ApiError, errorMessage } from '@/lib/api';
import { notify } from '@/lib/platform';

/** Shows a short Albanian alert for a failed server request. */
export function reportError(error: unknown): void {
  // An expired session is already handled (alert + back to the login screen).
  if (error instanceof ApiError && error.status === 401) return;
  const { title, message } = errorMessage(error);
  notify(title, message);
}

/**
 * For buttons that call the server: `busy` while the request runs (show a spinner, block double taps),
 * and failures become an alert. `run` resolves to undefined when the request failed.
 */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    try {
      return await fn();
    } catch (error) {
      reportError(error);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return [busy, run] as const;
}
