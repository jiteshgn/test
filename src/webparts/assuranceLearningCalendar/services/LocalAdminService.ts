import { AdminUserInput, IAdminUser, ICurrentUser, IVisitRecord, sameEmail } from '../models/IAdmin';
import { IAdminService, IVisitService } from './IAdminService';

/** Test user of the local harness (and of the Local data source in SharePoint). */
export const LOCAL_TEST_USER: ICurrentUser = {
  displayName: 'Local Tester',
  email: 'local.tester@example.com',
  isSiteAdmin: false
};

const SAMPLE_ADMINS: IAdminUser[] = [
  { id: '1', title: 'Local Tester', email: 'local.tester@example.com', isActive: true, superAdmin: true },
  { id: '2', title: 'Alex Morgan', email: 'alex.morgan@example.com', isActive: true, superAdmin: false },
  { id: '3', title: 'Sam Lee', email: 'sam.lee@example.com', isActive: true, superAdmin: false },
  { id: '4', title: 'Jordan Patel', email: 'jordan.patel@example.com', isActive: false, superAdmin: false }
];

const SAMPLE_VISITS: IVisitRecord[] = [
  {
    id: '1',
    userName: 'Morgan, Alex',
    email: 'alex.morgan@example.com',
    lastVisited: '2026-11-18T07:05:11Z',
    location: 'US - Mumbai',
    visits: 3,
    timeSpentSeconds: 95
  },
  {
    id: '2',
    userName: 'Lee, Sam',
    email: 'sam.lee@example.com',
    lastVisited: '2026-11-03T07:49:48Z',
    location: 'US - Bengaluru',
    visits: 1,
    timeSpentSeconds: 8
  }
];

/** Resolves with the result of `work` after a short delay, like a network call. */
function later<T>(work: () => T, delayMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(work());
      } catch (e) {
        reject(e);
      }
    }, delayMs);
  });
}

/** Admin access list kept in memory (local testing). */
export class LocalAdminService implements IAdminService {
  public readonly listName: string = 'local admin list';
  private _admins: IAdminUser[] = SAMPLE_ADMINS.map((a) => ({ ...a }));
  private _nextId: number = 100;
  private readonly _delayMs: number;

  constructor(delayMs: number = 400) {
    this._delayMs = delayMs;
  }

  public getAdmins(): Promise<IAdminUser[]> {
    return later(() => this._admins.map((a) => ({ ...a })), this._delayMs);
  }

  public addAdmin(user: AdminUserInput): Promise<IAdminUser> {
    return later(() => {
      const created: IAdminUser = { ...user, id: String(++this._nextId) };
      this._admins.push(created);
      return { ...created };
    }, this._delayMs);
  }

  public updateAdmin(user: IAdminUser): Promise<void> {
    return later(() => {
      this._admins = this._admins.map((a) => (a.id === user.id ? { ...user } : a));
    }, this._delayMs);
  }

  public deleteAdmin(id: string): Promise<void> {
    return later(() => {
      this._admins = this._admins.filter((a) => a.id !== id);
    }, this._delayMs);
  }
}

/** Visit records kept in memory (local testing). */
export class LocalVisitService implements IVisitService {
  private _visits: IVisitRecord[] = SAMPLE_VISITS.map((v) => ({ ...v }));

  public getVisits(): Promise<IVisitRecord[]> {
    return later(() => this._visits.map((v) => ({ ...v })), 300);
  }

  public recordVisit(user: ICurrentUser, seconds: number, newVisit: boolean): Promise<void> {
    const now: string = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const own: IVisitRecord[] = this._visits.filter((v) => sameEmail(v.email, user.email));
    if (own.length) {
      own[0].lastVisited = now;
      own[0].timeSpentSeconds += Math.round(seconds);
      own[0].visits += newVisit ? 1 : 0;
    } else {
      this._visits.push({
        id: String(this._visits.length + 1),
        userName: user.displayName,
        email: user.email,
        lastVisited: now,
        location: 'Local test',
        visits: 1,
        timeSpentSeconds: Math.round(seconds)
      });
    }
    return Promise.resolve();
  }
}
