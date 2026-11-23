import * as React from 'react';
import { IAdminAccess, ICurrentUser, NO_ACCESS, accessFor } from '../models/IAdmin';
import { IAdminService } from '../services/IAdminService';

/**
 * What the current user may do in the admin panel, read from the admin access list.
 * Reads again when `refreshKey` changes (after admin users were edited).
 * If the list cannot be read (not created yet, no permission), only site collection admins get access.
 */
export function useAdminAccess(
  service: IAdminService | undefined,
  user: ICurrentUser | undefined,
  refreshKey: number
): IAdminAccess {
  const [access, setAccess] = React.useState<IAdminAccess>({ ...NO_ACCESS, loading: true });

  React.useEffect(() => {
    if (!service || !user) {
      setAccess(NO_ACCESS);
      return;
    }
    let cancelled: boolean = false;
    service.getAdmins().then(
      (admins) => {
        if (!cancelled) {
          setAccess(accessFor(user, admins));
        }
      },
      () => {
        if (!cancelled) {
          setAccess(accessFor(user, []));
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [service, user, refreshKey]);

  return access;
}
