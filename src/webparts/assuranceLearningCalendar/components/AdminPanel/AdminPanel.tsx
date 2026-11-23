import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styles from './AdminPanel.module.scss';
import { IAdminAccess, ICurrentUser } from '../../models/IAdmin';
import { ICourseService } from '../../services/ICourseService';
import { IAdminService, IVisitService } from '../../services/IAdminService';
import { Icon } from '../Icons/Icon';
import { ConfirmDialog, IConfirmRequest } from './AdminParts';
import { ExcelImportTab } from './ExcelImportTab';
import { ListManagerTab } from './ListManagerTab';
import { TrackingTab } from './TrackingTab';
import { AdminAccessTab } from './AdminAccessTab';

export interface IAdminPanelProps {
  idPrefix: string;
  courseService: ICourseService;
  adminService: IAdminService;
  visitService: IVisitService;
  currentUser: ICurrentUser;
  access: IAdminAccess;
  /** Where imports go, e.g. 'the "AssuranceLearningCalendar" SharePoint list'. */
  targetLabel: string;
  trackingOn: boolean;
  /** Scale of the page when it is fitted to the screen width, so the panel matches it. */
  scale?: number;
  /** Events were added, changed or deleted: reload the calendar. */
  onCoursesChanged: () => void;
  /** Admin users changed: read the current user's access again. */
  onAdminsChanged: () => void;
  onClose: () => void;
}

type TabKey = 'import' | 'list' | 'tracking' | 'access';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'import', label: 'Excel Import' },
  { key: 'list', label: 'List Manager' },
  { key: 'tracking', label: 'Export Tracking Data' },
  { key: 'access', label: 'Admin Access' }
];

/**
 * Calendar Data Admin Panel (opened with the Admin button).
 * The parent renders it only while it is open, so mounting = open and unmounting = closed.
 */
export const AdminPanel = React.memo(function AdminPanel(props: IAdminPanelProps): React.ReactElement {
  const { idPrefix, access, currentUser, scale, onClose } = props;
  const [tab, setTab] = React.useState<TabKey>('import');
  const [confirmRequest, setConfirmRequest] = React.useState<IConfirmRequest | undefined>(undefined);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // On open: stop the page scrolling and focus the close button. On close: restore both.
  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | undefined;
    const previousOverflow: string = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) {
      closeRef.current.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.focus) {
        previousFocus.focus();
      }
    };
  }, []);

  // Escape closes the question first, then the panel.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }
      if (confirmRequest) {
        setConfirmRequest(undefined);
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmRequest, onClose]);

  // Arrow keys move between tabs (tab list keyboard pattern).
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let next: number = -1;
    if (event.key === 'ArrowRight') {
      next = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      next = (index - 1 + TABS.length) % TABS.length;
    }
    if (next >= 0) {
      event.preventDefault();
      setTab(TABS[next].key);
      const button = document.getElementById(`${idPrefix}-admin-tab-${TABS[next].key}`);
      if (button) {
        button.focus();
      }
    }
  };

  const titleId: string = `${idPrefix}-admin-title`;
  const role: string = access.isSuperAdmin ? 'Super Admin' : 'Admin';

  return ReactDOM.createPortal(
    <div className={styles.backdrop}>
      <div
        className={styles.panel}
        style={scale ? { zoom: scale } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <span className={styles.badge}>ADMIN</span>
          <h2 id={titleId} className={styles.title}>
            Calendar Data Admin Panel
          </h2>
          <span className={styles.who}>
            {currentUser.displayName}
            <span className={styles.role}>{role}</span>
          </span>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close admin panel"
          >
            <Icon name="close" size={26} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Admin sections">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              id={`${idPrefix}-admin-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`${idPrefix}-admin-panel`}
              tabIndex={tab === t.key ? 0 : -1}
              className={[styles.tab, tab === t.key ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          id={`${idPrefix}-admin-panel`}
          className={styles.body}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-admin-tab-${tab}`}
        >
          {tab === 'import' && (
            <ExcelImportTab
              service={props.courseService}
              targetLabel={props.targetLabel}
              isSuperAdmin={access.isSuperAdmin}
              onChanged={props.onCoursesChanged}
              confirm={setConfirmRequest}
            />
          )}
          {tab === 'list' && (
            <ListManagerTab
              idPrefix={idPrefix}
              service={props.courseService}
              isSuperAdmin={access.isSuperAdmin}
              onChanged={props.onCoursesChanged}
              confirm={setConfirmRequest}
            />
          )}
          {tab === 'tracking' && <TrackingTab service={props.visitService} trackingOn={props.trackingOn} />}
          {tab === 'access' && (
            <AdminAccessTab
              idPrefix={idPrefix}
              service={props.adminService}
              currentUser={currentUser}
              isSuperAdmin={access.isSuperAdmin}
              onChanged={props.onAdminsChanged}
            />
          )}
        </div>

        {confirmRequest && <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(undefined)} />}
      </div>
    </div>,
    document.body
  );
});
