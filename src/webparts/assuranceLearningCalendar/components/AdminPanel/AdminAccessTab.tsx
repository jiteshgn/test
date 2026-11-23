import * as React from 'react';
import styles from './AdminPanel.module.scss';
import { AdminUserInput, IAdminUser, ICurrentUser, sameEmail } from '../../models/IAdmin';
import { IAdminService } from '../../services/IAdminService';
import { errorMessage } from '../../utils/asyncUtils';
import { Icon } from '../Icons/Icon';
import { ButtonSpinner, IPanelMessage, Loading, Message } from './AdminParts';

export interface IAdminAccessTabProps {
  idPrefix: string;
  service: IAdminService;
  currentUser: ICurrentUser;
  isSuperAdmin: boolean;
  /** Admin users changed (access may change). */
  onChanged: () => void;
}

type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; user: IAdminUser };

const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What each kind of user may do (shown at the top of the tab). */
export function RoleCards(): React.ReactElement {
  return (
    <div className={styles.roles}>
      <div className={styles.roleCard}>
        <h4>Super Admin</h4>
        <ul>
          <li>Everything an Admin can do</li>
          <li>Add admin users, change their access, make them inactive</li>
          <li>Delete inactive events permanently, Delete All Data</li>
        </ul>
      </div>
      <div className={styles.roleCard}>
        <h4>Admin</h4>
        <ul>
          <li>Import events from Excel, export data</li>
          <li>Add and edit events, make them inactive or active again</li>
          <li>Export tracking data; view admin users</li>
        </ul>
      </div>
      <div className={styles.roleCard}>
        <h4>Inactive users and everyone else</h4>
        <ul>
          <li>No Admin button: they see the calendar only</li>
          <li>Inactive events are hidden from them</li>
          <li>Site collection admins always count as Super Admins</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Admin Access Management: who sees the Admin panel and who is a Super Admin.
 * Users are made inactive instead of deleted. Only active Super Admins can make changes,
 * nobody can change their own access, and the last active Super Admin cannot be removed.
 */
export function AdminAccessTab({
  idPrefix,
  service,
  currentUser,
  isSuperAdmin,
  onChanged
}: IAdminAccessTabProps): React.ReactElement {
  const [admins, setAdmins] = React.useState<IAdminUser[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [form, setForm] = React.useState<FormState>({ mode: 'closed' });
  const [saving, setSaving] = React.useState<boolean>(false);
  const [busyId, setBusyId] = React.useState<string>('');
  const [message, setMessage] = React.useState<IPanelMessage | undefined>(undefined);

  const load = React.useCallback((): Promise<void> => {
    return service.getAdmins().then(
      (items) => {
        setAdmins(items);
        setLoading(false);
      },
      (e: unknown) => {
        setLoading(false);
        setMessage({
          kind: 'error',
          text: `The admin users could not be loaded from "${service.listName}". ${errorMessage(e)}`
        });
      }
    );
  }, [service]);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  /** Why this change is not allowed, or '' when it is. */
  const blockReason = (user: IAdminUser, next: AdminUserInput): string => {
    if (sameEmail(user.email, currentUser.email) && (!next.isActive || !next.superAdmin) && user.superAdmin) {
      return 'You cannot remove your own Super Admin access. Ask another Super Admin.';
    }
    const losesSuper: boolean = user.isActive && user.superAdmin && !(next.isActive && next.superAdmin);
    const otherSupers: number = admins.filter((a) => a.id !== user.id && a.isActive && a.superAdmin).length;
    if (losesSuper && otherSupers === 0) {
      return 'There must always be at least one active Super Admin.';
    }
    return '';
  };

  const afterChange = (text: string): Promise<void> => {
    setMessage({ kind: 'success', text });
    onChanged();
    return load();
  };

  const save = (input: AdminUserInput): void => {
    const editing: IAdminUser | undefined = form.mode === 'edit' ? form.user : undefined;
    const duplicate: boolean = admins.some((a) => sameEmail(a.email, input.email) && (!editing || a.id !== editing.id));
    if (duplicate) {
      setMessage({ kind: 'error', text: `${input.email} is already in the list. Edit that row instead.` });
      return;
    }
    if (editing) {
      const reason: string = blockReason(editing, input);
      if (reason) {
        setMessage({ kind: 'error', text: reason });
        return;
      }
    }
    setSaving(true);
    setMessage(undefined);
    const work: Promise<unknown> = editing
      ? service.updateAdmin({ ...input, id: editing.id })
      : service.addAdmin(input);
    work
      .then(() => {
        setForm({ mode: 'closed' });
        return afterChange(editing ? `${input.title} was updated.` : `${input.title} was added.`);
      })
      .catch((e: unknown) => setMessage({ kind: 'error', text: `The user could not be saved. ${errorMessage(e)}` }))
      .then(() => setSaving(false));
  };

  const setActive = (user: IAdminUser, isActive: boolean): void => {
    const next: AdminUserInput = { ...user, isActive };
    const reason: string = blockReason(user, next);
    if (reason) {
      setMessage({ kind: 'error', text: reason });
      return;
    }
    setBusyId(user.id);
    setMessage(undefined);
    service
      .updateAdmin({ ...user, isActive })
      .then(() =>
        afterChange(
          isActive
            ? `${user.title} is active again.`
            : `${user.title} is now inactive and no longer sees the Admin panel.`
        )
      )
      .catch((e: unknown) => setMessage({ kind: 'error', text: `The change could not be saved. ${errorMessage(e)}` }))
      .then(() => setBusyId(''));
  };

  const pill = (yes: boolean, superStyle?: boolean): React.ReactElement => (
    <span className={[styles.pill, yes ? (superStyle ? styles.pillSuper : styles.pillYes) : styles.pillNo].join(' ')}>
      {yes ? 'Yes' : 'No'}
    </span>
  );

  return (
    <div>
      <div className={styles.toolbar}>
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
          Admin Access Management
        </h3>
        {isSuperAdmin && (
          <button
            type="button"
            className={[styles.button, styles.primary].join(' ')}
            onClick={() => {
              setMessage(undefined);
              setForm({ mode: 'add' });
            }}
          >
            <Icon name="plus" size={18} strokeWidth={2.6} />
            Add User
          </button>
        )}
      </div>

      <RoleCards />

      {!isSuperAdmin && (
        <Message
          message={{
            kind: 'info',
            text: 'You have view-only access. Only active Super Admins can add or change users.'
          }}
        />
      )}
      <Message message={message} />

      {form.mode !== 'closed' && (
        <AdminUserForm
          idPrefix={idPrefix}
          user={form.mode === 'edit' ? form.user : undefined}
          isSelf={form.mode === 'edit' && sameEmail(form.user.email, currentUser.email)}
          saving={saving}
          onSave={save}
          onCancel={() => setForm({ mode: 'closed' })}
        />
      )}

      {loading ? (
        <Loading text="Loading admin users..." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Email</th>
                <th scope="col" className={styles.center}>
                  Is Active
                </th>
                <th scope="col" className={styles.center}>
                  Super Admin
                </th>
                {isSuperAdmin && (
                  <th scope="col" className={styles.center}>
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No admin users yet.
                  </td>
                </tr>
              )}
              {admins.map((a) => {
                const self: boolean = sameEmail(a.email, currentUser.email);
                return (
                  <tr key={a.id} className={a.isActive ? '' : styles.rowInactive}>
                    <td>
                      {a.title}
                      {self && <span className={styles.you}>(you)</span>}
                    </td>
                    <td>{a.email}</td>
                    <td className={styles.center}>{pill(a.isActive)}</td>
                    <td className={styles.center}>{pill(a.superAdmin, true)}</td>
                    {isSuperAdmin && (
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            title="Edit"
                            aria-label={`Edit ${a.title}`}
                            disabled={busyId === a.id}
                            onClick={() => {
                              setMessage(undefined);
                              setForm({ mode: 'edit', user: a });
                            }}
                          >
                            <Icon name="pencil" size={18} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconButton}
                            title={
                              self ? 'You cannot make yourself inactive' : a.isActive ? 'Make inactive' : 'Make active'
                            }
                            aria-label={a.isActive ? `Make ${a.title} inactive` : `Make ${a.title} active`}
                            disabled={busyId === a.id || self}
                            onClick={() => setActive(a, !a.isActive)}
                          >
                            <Icon name={a.isActive ? 'eyeOff' : 'eye'} size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface IAdminUserFormProps {
  idPrefix: string;
  user: IAdminUser | undefined;
  /** Editing your own row: access switches are locked. */
  isSelf: boolean;
  saving: boolean;
  onSave: (user: AdminUserInput) => void;
  onCancel: () => void;
}

function AdminUserForm({ idPrefix, user, isSelf, saving, onSave, onCancel }: IAdminUserFormProps): React.ReactElement {
  const [title, setTitle] = React.useState<string>(user ? user.title : '');
  const [email, setEmail] = React.useState<string>(user ? user.email : '');
  const [isActive, setIsActive] = React.useState<boolean>(user ? user.isActive : true);
  const [superAdmin, setSuperAdmin] = React.useState<boolean>(user ? user.superAdmin : false);
  const [errors, setErrors] = React.useState<{ title?: string; email?: string }>({});
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTitle(user ? user.title : '');
    setEmail(user ? user.email : '');
    setIsActive(user ? user.isActive : true);
    setSuperAdmin(user ? user.superAdmin : false);
    setErrors({});
    if (nameRef.current) {
      nameRef.current.focus();
    }
  }, [user]);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const found: { title?: string; email?: string } = {};
    if (!title.trim()) {
      found.title = 'Name is required.';
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      found.email = 'Enter a valid email address.';
    }
    setErrors(found);
    if (!found.title && !found.email) {
      onSave({ title: title.trim(), email: email.trim().toLowerCase(), isActive, superAdmin });
    }
  };

  const id = (key: string): string => `${idPrefix}-admin-${key}`;

  return (
    <form className={styles.formCard} onSubmit={submit} noValidate aria-label={user ? 'Edit User' : 'Add User'}>
      <h3 className={styles.formTitle}>{user ? 'Edit User' : 'Add User'}</h3>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id('title')}>
            Name<span className={styles.required}> *</span>
          </label>
          <input
            ref={nameRef}
            id={id('title')}
            className={[styles.input, errors.title ? styles.invalid : ''].join(' ')}
            type="text"
            value={title}
            aria-invalid={!!errors.title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <span className={styles.fieldError}>{errors.title}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id('email')}>
            Email<span className={styles.required}> *</span>
          </label>
          <input
            id={id('email')}
            className={[styles.input, errors.email ? styles.invalid : ''].join(' ')}
            type="email"
            value={email}
            aria-invalid={!!errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
        </div>
        <div className={[styles.field, styles.fieldWide].join(' ')}>
          <div className={styles.checks}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={isActive}
                disabled={isSelf}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Is Active
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={superAdmin}
                disabled={isSelf}
                onChange={(e) => setSuperAdmin(e.target.checked)}
              />
              Super Admin
            </label>
            {isSelf && <span className={styles.hint}>You cannot change your own access.</span>}
          </div>
        </div>
      </div>
      <div className={styles.formButtons}>
        <button
          type="button"
          className={[styles.button, styles.outline].join(' ')}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className={[styles.button, styles.primary].join(' ')} disabled={saving}>
          {saving && <ButtonSpinner />}
          {user ? 'Update' : 'Add User'}
        </button>
      </div>
    </form>
  );
}
