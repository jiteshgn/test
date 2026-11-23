/** The person viewing the page. */
export interface ICurrentUser {
  displayName: string;
  /** Lower-case email (or login name when there is no email). */
  email: string;
  /** SharePoint site collection admins always count as Super Admins, so the first admin can be added. */
  isSiteAdmin: boolean;
}

/** A row of the admin access list. */
export interface IAdminUser {
  id: string;
  /** Display name. */
  title: string;
  email: string;
  isActive: boolean;
  /** Super Admins can add and remove admin users. */
  superAdmin: boolean;
}

export type AdminUserInput = Pick<IAdminUser, 'title' | 'email' | 'isActive' | 'superAdmin'>;

/** One user's visits to the calendar page. */
export interface IVisitRecord {
  id: string;
  userName: string;
  email: string;
  /** ISO date-time (UTC) of the latest visit, e.g. 2026-11-18T07:05:11Z. */
  lastVisited: string;
  /** Office location from the user profile, e.g. "US - Mumbai". */
  location: string;
  visits: number;
  /** Total time the page was open and visible, seconds. */
  timeSpentSeconds: number;
}

/** What the current user may do. */
export interface IAdminAccess {
  /** Still reading the admin list. */
  loading: boolean;
  /** Sees the Admin button and panel. */
  isAdmin: boolean;
  /** Can add and remove admin users. */
  isSuperAdmin: boolean;
}

export const NO_ACCESS: IAdminAccess = { loading: false, isAdmin: false, isSuperAdmin: false };

/** Case-insensitive email comparison. */
export function sameEmail(a: string, b: string): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** The current user's access, from the admin list. */
export function accessFor(user: ICurrentUser, admins: IAdminUser[]): IAdminAccess {
  const own: IAdminUser[] = admins.filter((a) => a.isActive && sameEmail(a.email, user.email));
  return {
    loading: false,
    isAdmin: user.isSiteAdmin || own.length > 0,
    isSuperAdmin: user.isSiteAdmin || own.some((a) => a.superAdmin)
  };
}
