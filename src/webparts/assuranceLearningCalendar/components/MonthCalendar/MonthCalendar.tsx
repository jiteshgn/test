import * as React from 'react';
import styles from './MonthCalendar.module.scss';
import { ICourse } from '../../models/ICourse';
import { ICalendarWeek, buildMonthWeeks } from '../../utils/calendarLayout';
import { MONTH_NAMES, WEEKDAY_NAMES, toIsoDate } from '../../utils/dateUtils';
import { CalendarEvent } from './CalendarEvent';
import { Icon } from '../Icons/Icon';

export interface IMonthCalendarProps {
  /** Any date inside the month to show. */
  month: Date;
  courses: ICourse[];
  today: Date;
  onPrev: () => void;
  onNext: () => void;
  onCurrent: () => void;
  onSelectCourse: (course: ICourse) => void;
}

/** Monday–Friday month grid with multi-day event bars. */
export const MonthCalendar = React.memo(function MonthCalendar({
  month,
  courses,
  today,
  onPrev,
  onNext,
  onCurrent,
  onSelectCourse
}: IMonthCalendarProps): React.ReactElement {
  // Week rows and event lanes are only rebuilt when the month or the course list changes.
  const weeks: ICalendarWeek[] = React.useMemo(() => buildMonthWeeks(month, courses), [month, courses]);
  const title: string = `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`;
  const todayIso: string = toIsoDate(today);

  return (
    <section className={styles.calendarSection} aria-label="Monthly calendar">
      <div className={styles.bar}>
        <h2 className={styles.monthTitle} aria-live="polite">
          {title}
        </h2>
        <div className={styles.navs}>
          <button type="button" className={styles.navButton} onClick={onPrev} aria-label="Previous month">
            <Icon name="chevronLeft" size={26} strokeWidth={1.6} />
          </button>
          <button type="button" className={styles.currentButton} onClick={onCurrent}>
            Current Month
          </button>
          <button type="button" className={styles.navButton} onClick={onNext} aria-label="Next month">
            <Icon name="chevronRight" size={26} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.weekdays} role="row">
          {WEEKDAY_NAMES.map((name) => (
            <div key={name} className={styles.weekday} role="columnheader">
              <span className={styles.weekdayFull}>{name}</span>
              <span className={styles.weekdayShort} aria-hidden="true">
                {name.substring(0, 3)}
              </span>
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div
            key={week.key}
            className={styles.week}
            role="row"
            style={{
              gridTemplateRows:
                `max(var(--alc-top-min), calc(var(--alc-cell-h) - ${week.laneCount} * var(--alc-lane-h) - var(--alc-pad)))` +
                `${week.laneCount ? ` repeat(${week.laneCount}, var(--alc-lane-h))` : ''} var(--alc-pad)`
            }}
          >
            {week.days.map((day, i) => (
              <div
                key={week.isoDays[i]}
                role="gridcell"
                className={[
                  styles.day,
                  week.inMonth[i] ? '' : styles.dayOutside,
                  week.isoDays[i] === todayIso ? styles.dayToday : ''
                ].join(' ')}
                style={{ gridColumn: `${i + 1}`, gridRow: '1 / -1' }}
                aria-label={week.inMonth[i] ? `${MONTH_NAMES[day.getMonth()]} ${day.getDate()}` : undefined}
              >
                {week.inMonth[i] && <span className={styles.dayNumber}>{day.getDate()}</span>}
              </div>
            ))}
            {week.segments.map((segment) => (
              <CalendarEvent
                key={`${segment.course.id}-${week.key}`}
                segment={segment}
                onSelect={onSelectCourse}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
});
