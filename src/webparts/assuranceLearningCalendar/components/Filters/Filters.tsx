import * as React from 'react';
import styles from './Filters.module.scss';
import { IFilterState } from '../../models/ICourse';
import { Dropdown } from './Dropdown';
import { DateRangePicker } from './DateRangePicker';
import { PillButton } from './PillButton';

export interface IFiltersProps {
  idPrefix: string;
  courseNames: string[];
  regions: string[];
  offerings: string[];
  filters: IFilterState;
  today?: Date;
  exportDisabled?: boolean;
  onCourseNameChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onOfferingChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onApply: () => void;
  onReset: () => void;
  onExport: () => void;
  /** Shown only to admins: opens the admin panel. */
  onAdmin?: () => void;
}

/** The Filters bar: Course Name, Region, Offerings, date range, and the Apply / Reset / Export buttons. */
export const Filters = React.memo(function Filters(p: IFiltersProps): React.ReactElement {
  return (
    <section className={styles.filters} aria-labelledby={`${p.idPrefix}-filters-title`}>
      <div className={styles.headingRow}>
        <h2 id={`${p.idPrefix}-filters-title`} className={styles.heading}>
          Filters
        </h2>
        {p.onAdmin && (
          <button type="button" className={styles.adminButton} onClick={p.onAdmin} aria-haspopup="dialog">
            Admin
          </button>
        )}
      </div>

      <div className={styles.fields}>
        <Dropdown
          id={`${p.idPrefix}-course`}
          className={styles.course}
          placeholder="Course Name"
          options={p.courseNames}
          value={p.filters.courseName}
          searchable={true}
          freeText={true}
          onChange={p.onCourseNameChange}
        />
        <Dropdown
          id={`${p.idPrefix}-region`}
          className={styles.region}
          placeholder="Region"
          options={p.regions}
          value={p.filters.region}
          searchable={true}
          onChange={p.onRegionChange}
        />
        <Dropdown
          id={`${p.idPrefix}-offering`}
          className={styles.offering}
          placeholder="Offerings"
          options={p.offerings}
          value={p.filters.offering}
          searchable={true}
          onChange={p.onOfferingChange}
        />
        <DateRangePicker
          id={`${p.idPrefix}-range`}
          className={styles.range}
          placeholder="Enter a date range"
          start={p.filters.rangeStart}
          end={p.filters.rangeEnd}
          today={p.today}
          onChange={p.onDateRangeChange}
        />
      </div>

      <div className={styles.actions}>
        <PillButton label="Apply" icon="check" onClick={p.onApply} />
        <PillButton label="Reset" icon="refresh" className={styles.reset} onClick={p.onReset} />
        <PillButton
          label="Export Excel"
          icon="arrowUp"
          variant="dark"
          disabled={p.exportDisabled}
          onClick={p.onExport}
        />
      </div>
    </section>
  );
});
