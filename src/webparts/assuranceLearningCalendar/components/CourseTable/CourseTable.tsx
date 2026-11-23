import * as React from 'react';
import styles from './CourseTable.module.scss';
import { CourseSortKey, ICourse, ISortState } from '../../models/ICourse';
import { CourseRow } from './CourseRow';
import { Icon } from '../Icons/Icon';

export interface ICourseTableProps {
  courses: ICourse[];
  sort: ISortState;
  expandedId: string;
  loading: boolean;
  error: string;
  /** Height of the scrolling table area in px. */
  maxHeight: number;
  onSort: (key: CourseSortKey) => void;
  onToggle: (id: string) => void;
}

interface IColumn {
  key: CourseSortKey;
  label: string;
}

const COLUMNS: IColumn[] = [
  { key: 'title', label: 'Course Title' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'startTime', label: 'Start Timings' },
  { key: 'endTime', label: 'End Timings' },
  { key: 'cpeCredits', label: 'CPE Credits' },
  { key: 'duration', label: 'Duration' }
];

/** Sortable course list with a sticky header. Rows expand to show the course details. */
export const CourseTable = React.memo(function CourseTable({
  courses,
  sort,
  expandedId,
  loading,
  error,
  maxHeight,
  onSort,
  onToggle
}: ICourseTableProps): React.ReactElement {
  return (
    <section className={styles.tableSection} aria-label="Course schedule">
      <div className={styles.tableWrap}>
        <div className={styles.scroller} style={{ maxHeight }}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colTitle} />
              <col className={styles.colDate} />
              <col className={styles.colDate} />
              <col className={styles.colTime} />
              <col className={styles.colTime} />
              <col className={styles.colNum} />
              <col className={styles.colNum} />
            </colgroup>
            <thead>
              <tr>
                {COLUMNS.map((col) => {
                  const active: boolean = sort.key === col.key;
                  const iconClass: string = [
                    styles.sortIcon,
                    active && sort.direction === 'desc' ? styles.sortDesc : ''
                  ].join(' ');
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        className={[styles.sortButton, active ? styles.sortActive : ''].join(' ')}
                        onClick={() => onSort(col.key)}
                      >
                        <span>{col.label}</span>
                        <Icon name="arrowUp" size={18} strokeWidth={2.4} className={iconClass} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr className={styles.messageRow}>
                  <td colSpan={COLUMNS.length}>Loading classes…</td>
                </tr>
              )}
              {!loading && error && (
                <tr className={styles.messageRow}>
                  <td colSpan={COLUMNS.length} role="alert">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && courses.length === 0 && (
                <tr className={styles.messageRow}>
                  <td colSpan={COLUMNS.length}>No classes match the selected filters.</td>
                </tr>
              )}
              {!loading &&
                !error &&
                courses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    expanded={course.id === expandedId}
                    columnCount={COLUMNS.length}
                    onToggle={onToggle}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
});
