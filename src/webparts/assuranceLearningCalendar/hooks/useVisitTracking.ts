import * as React from 'react';
import { ICurrentUser } from '../models/IAdmin';
import { IVisitService } from '../services/IAdminService';

/** Viewing time is saved at least this often while the page is open, ms. */
const SAVE_EVERY_MS: number = 60000;

/**
 * Records the visit (user, time, office location) and how long the page stays open and visible.
 * Time in a hidden tab does not count. Errors are ignored: tracking never disturbs the page.
 */
export function useVisitTracking(
  service: IVisitService | undefined,
  user: ICurrentUser | undefined,
  enabled: boolean
): void {
  React.useEffect(() => {
    if (!enabled || !service || !user || !user.email) {
      return;
    }
    /** When the current visible stretch started (0 = page hidden). */
    let visibleSince: number = document.visibilityState === 'visible' ? Date.now() : 0;
    /** Visible time not saved yet, ms. */
    let pendingMs: number = 0;

    const collect = (): void => {
      if (visibleSince) {
        const now: number = Date.now();
        pendingMs += now - visibleSince;
        visibleSince = now;
      }
    };

    const save = (keepalive: boolean): void => {
      collect();
      const seconds: number = Math.floor(pendingMs / 1000);
      if (seconds < 1) {
        return;
      }
      pendingMs -= seconds * 1000;
      service.recordVisit(user, seconds, false, keepalive).catch(() => undefined);
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        visibleSince = Date.now();
      } else {
        save(true);
        visibleSince = 0;
      }
    };
    const onPageHide = (): void => save(true);

    service.recordVisit(user, 0, true).catch(() => undefined);
    const timer: number = window.setInterval(() => save(false), SAVE_EVERY_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      save(true);
    };
  }, [service, user, enabled]);
}
