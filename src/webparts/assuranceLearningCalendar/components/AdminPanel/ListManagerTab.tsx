import * as React from 'react';
import styles from './AdminPanel.module.scss';
import { ICourse } from '../../models/ICourse';
import { CourseInput, ICourseService } from '../../services/ICourseService';
import { distinctSorted, formatTimeWithZone } from '../../utils/courseUtils';
import { errorMessage } from '../../utils/asyncUtils';
import { Icon } from '../Icons/Icon';
import { EventForm } from './EventForm';
import { IConfirmRequest, IPanelMessage, Loading, Message } from './AdminParts';

export interface IListManagerTabProps {
  idPrefix: string;
  service: ICourseService;
  isSuperAdmin: boolean;
  onChanged: () => void;
  confirm: (request: IConfirmRequest) => void;
}

type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; course: ICourse };

/** Latest classes first. */
function byStartDesc(a: ICourse, b: ICourse): number {
  return b.startDate.localeCompare(a.startDate) || a.title.localeCompare(b.title);
}

/**
 * List Manager: search, add and edit classes. Instead of deleting, a class is made inactive
 * (hidden from the calendar, can be made active again). Super Admins can delete an inactive class for good.
 */
export function ListManagerTab({
  idPrefix,
  service,
  isSuperAdmin,
  onChanged,
  confirm
}: IListManagerTabProps): React.ReactElement {
  const [courses, setCourses] = React.useState<ICourse[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [search, setSearch] = React.useState<string>('');
  const [form, setForm] = React.useState<FormState>({ mode: 'closed' });
  const [saving, setSaving] = React.useState<boolean>(false);
  /** Row with a change in progress. */
  const [busyId, setBusyId] = React.useState<string>('');
  const [message, setMessage] = React.useState<IPanelMessage | undefined>(undefined);

  const load = React.useCallback((): Promise<void> => {
    return service.getCourses().then(
      (items) => {
        setCourses(items.slice().sort(byStartDesc));
        setLoading(false);
      },
      (e: unknown) => {
        setLoading(false);
        setMessage({ kind: 'error', text: `The calendar items could not be loaded. ${errorMessage(e)}` });
      }
    );
  }, [service]);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const offerings: string[] = React.useMemo(() => distinctSorted(courses, 'offering'), [courses]);
  const regions: string[] = React.useMemo(() => distinctSorted(courses, 'region'), [courses]);
  const activeCount: number = courses.filter((c) => c.isActive !== false).length;

  const visible: ICourse[] = React.useMemo(() => {
    const text: string = search.trim().toLowerCase();
    if (!text) {
      return courses;
    }
    return courses.filter(
      (c) =>
        [c.title, c.offering, c.region, c.trainingType, c.startDate, c.endDate]
          .join(' ')
          .toLowerCase()
          .indexOf(text) !== -1
    );
  }, [courses, search]);

  const afterChange = (text: string): Promise<void> => {
    setMessage({ kind: 'success', text });
    onChanged();
    return load();
  };

  const save = (input: CourseInput): void => {
    setSaving(true);
    setMessage(undefined);
    const editing: ICourse | undefined = form.mode === 'edit' ? form.course : undefined;
    const work: Promise<unknown> = editing
      ? service.updateCourse({ ...input, id: editing.id })
      : service.addCourse(input);
    work
      .then(() => {
        setForm({ mode: 'closed' });
        return afterChange(editing ? `"${input.title}" was updated.` : `"${input.title}" was added.`);
      })
      .catch((e: unknown) => {
        setMessage({ kind: 'error', text: `The event could not be saved. ${errorMessage(e)}` });
      })
      .then(() => setSaving(false));
  };

  const setActive = (course: ICourse, isActive: boolean): void => {
    setBusyId(course.id);
    setMessage(undefined);
    service
      .updateCourse({ ...course, isActive })
      .then(() =>
        afterChange(
          isActive
            ? `"${course.title}" is active again and shows on the calendar.`
            : `"${course.title}" is now inactive: it is hidden from the calendar and can be made active again.`
        )
      )
      .catch((e: unknown) => setMessage({ kind: 'error', text: `The change could not be saved. ${errorMessage(e)}` }))
      .then(() => setBusyId(''));
  };

  const deleteForGood = (course: ICourse): void => {
    confirm({
      title: 'Delete this event permanently?',
      lines: [
        `"${course.title}" (${course.startDate}) will be removed from the list.`,
        'It goes to the SharePoint recycle bin; it cannot be made active again from here.'
      ],
      confirmLabel: 'Delete permanently',
      danger: true,
      onConfirm: () => {
        setBusyId(course.id);
        setMessage(undefined);
        service
          .deleteCourse(course.id)
          .then(() => afterChange(`"${course.title}" was deleted.`))
          .catch((e: unknown) =>
            setMessage({ kind: 'error', text: `The event could not be deleted. ${errorMessage(e)}` })
          )
          .then(() => setBusyId(''));
      }
    });
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search events..."
          aria-label="Search events"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className={[styles.button, styles.primary].join(' ')}
          onClick={() => {
            setMessage(undefined);
            setForm({ mode: 'add' });
          }}
        >
          <Icon name="plus" size={18} strokeWidth={2.6} />
          Add New Event
        </button>
      </div>

      <Message message={message} />

      {form.mode !== 'closed' && (
        <EventForm
          idPrefix={idPrefix}
          course={form.mode === 'edit' ? form.course : undefined}
          offerings={offerings}
          regions={regions}
          saving={saving}
          onSave={save}
          onCancel={() => setForm({ mode: 'closed' })}
        />
      )}

      {loading ? (
        <Loading text="Loading calendar items..." />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Event Name</th>
                  <th scope="col">Start Date</th>
                  <th scope="col">End Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Offering</th>
                  <th scope="col">Region</th>
                  <th scope="col" className={styles.center}>
                    Status
                  </th>
                  <th scope="col" className={styles.center}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      {courses.length ? 'No events match the search.' : 'There are no events yet.'}
                    </td>
                  </tr>
                )}
                {visible.map((c) => {
                  const active: boolean = c.isActive !== false;
                  const busy: boolean = busyId === c.id;
                  return (
                    <tr key={c.id} className={active ? '' : styles.rowInactive}>
                      <td>
                        <div className={styles.ellipsis} title={c.title}>
                          {c.title}
                        </div>
                      </td>
                      <td className={styles.nowrap}>{c.startDate}</td>
                      <td className={styles.nowrap}>{c.endDate}</td>
                      <td className={styles.nowrap}>
                        {c.startTime} - {formatTimeWithZone(c.endTime, c.timeZone)}
                      </td>
                      <td>{c.offering}</td>
                      <td className={styles.nowrap}>{c.region}</td>
                      <td className={styles.center}>
                        <span className={[styles.pill, active ? styles.pillYes : styles.pillNo].join(' ')}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            title="Edit"
                            aria-label={`Edit ${c.title}`}
                            disabled={busy}
                            onClick={() => {
                              setMessage(undefined);
                              setForm({ mode: 'edit', course: c });
                            }}
                          >
                            <Icon name="pencil" size={18} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconButton}
                            title={active ? 'Make inactive (hide from the calendar)' : 'Make active again'}
                            aria-label={active ? `Make ${c.title} inactive` : `Make ${c.title} active`}
                            disabled={busy}
                            onClick={() => setActive(c, !active)}
                          >
                            <Icon name={active ? 'eyeOff' : 'eye'} size={18} />
                          </button>
                          {isSuperAdmin && !active && (
                            <button
                              type="button"
                              className={[styles.iconButton, styles.iconDanger].join(' ')}
                              title="Delete permanently (Super Admin)"
                              aria-label={`Delete ${c.title} permanently`}
                              disabled={busy}
                              onClick={() => deleteForGood(c)}
                            >
                              <Icon name="trash" size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.total}>
            Total: <strong>{courses.length}</strong> item(s) · {activeCount} active, {courses.length - activeCount}{' '}
            inactive
            {search.trim() ? ` · ${visible.length} shown` : ''}
          </div>
        </>
      )}
    </div>
  );
}
