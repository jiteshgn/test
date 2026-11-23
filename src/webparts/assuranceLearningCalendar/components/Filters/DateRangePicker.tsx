import * as React from 'react';
import styles from './DateRangePicker.module.scss';
import { Icon } from '../Icons/Icon';
import {
  MONTH_SHORT,
  addMonths,
  formatShortDate,
  isSameMonth,
  parseIsoDate,
  parseShortDate,
  startOfMonth,
  toIsoDate
} from '../../utils/dateUtils';

export interface IDateRangePickerProps {
  id: string;
  /** Label: shown in the box when it is empty, above the dates once it is focused or filled. */
  placeholder: string;
  /** Hints in the two date boxes, default "Start Date" and "End Date". */
  startPlaceholder?: string;
  endPlaceholder?: string;
  /** ISO date or '' */
  start: string;
  /** ISO date or '' */
  end: string;
  /** Today's date; injectable for testing. */
  today?: Date;
  className?: string;
  onChange: (start: string, end: string) => void;
}

type PickerView = 'month' | 'year';

const WEEKDAY_LETTERS: string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** The month label sits in the first row when the month starts at least this many days in. */
const LABEL_MIN_CELLS: number = 3;
const MONTH_ROWS: number[][] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11]
];

interface IDayCell {
  iso: string;
  day: number;
}

interface ITypedRange {
  start: string;
  end: string;
}

/**
 * Material-style date range field. Dates can be typed (M/D/YYYY) in the Start Date and End Date boxes,
 * or picked with the calendar button: the first click sets the start, the second click the end.
 */
export const DateRangePicker = React.memo(function DateRangePicker({
  id,
  placeholder,
  startPlaceholder = 'Start Date',
  endPlaceholder = 'End Date',
  start,
  end,
  today,
  className,
  onChange
}: IDateRangePickerProps): React.ReactElement {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const startRef = React.useRef<HTMLInputElement>(null);

  /** Text in the two date boxes. */
  const [startText, setStartText] = React.useState<string>(() => formatShortDate(start));
  const [endText, setEndText] = React.useState<string>(() => formatShortDate(end));
  /** True while the cursor is in one of the date boxes. */
  const [focused, setFocused] = React.useState<boolean>(false);
  /** Range last sent while typing, so the text being typed is not re-formatted under the cursor. */
  const typedRef = React.useRef<ITypedRange | undefined>(undefined);

  // A range set from outside (calendar, Reset) is shown in the boxes.
  React.useEffect(() => {
    const typed: ITypedRange | undefined = typedRef.current;
    if (typed && typed.start === start && typed.end === end) {
      return;
    }
    typedRef.current = undefined;
    setStartText(formatShortDate(start));
    setEndText(formatShortDate(end));
  }, [start, end]);

  const [open, setOpen] = React.useState<boolean>(false);
  /** Day grid ('month') or month grid ('year'). */
  const [view, setView] = React.useState<PickerView>('month');
  /** First day of the month (or year) the popup is showing. */
  const [viewDate, setViewDate] = React.useState<Date>(() =>
    startOfMonth(start ? parseIsoDate(start) : today || new Date())
  );
  /** Day under the mouse, used to preview the range before the end is picked. */
  const [hoverIso, setHoverIso] = React.useState<string>('');

  /** Closes the popup. A half-picked range becomes a single-day range. */
  const close = React.useCallback((): void => {
    setOpen(false);
    if (start && !end) {
      onChange(start, start);
    }
  }, [start, end, onChange]);

  // While the popup is open, a click outside it or the Escape key closes it.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const onDocumentMouseDown = (event: MouseEvent): void => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        close();
      }
    };
    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [open, close]);

  const toggle = (): void => {
    if (open) {
      close();
      return;
    }
    setOpen(true);
    setView('month');
    setViewDate(startOfMonth(start ? parseIsoDate(start) : today || new Date()));
    setHoverIso('');
  };

  const pick = (iso: string): void => {
    if (!start || end || iso < start) {
      onChange(iso, '');
      return;
    }
    onChange(start, iso);
    setOpen(false);
  };

  const step = (direction: 1 | -1): void => {
    setViewDate(addMonths(viewDate, view === 'month' ? direction : direction * 12));
  };

  const onIconClick = (event: React.MouseEvent): void => {
    event.stopPropagation();
    toggle();
  };

  // Typing: a real date filters at once; an unfinished or wrong date counts as empty (and shows red once left).
  const emitTyped = (nextStart: string, nextEnd: string): void => {
    const s: string = parseShortDate(nextStart) || '';
    let e: string = parseShortDate(nextEnd) || '';
    if (s && e && e < s) {
      e = '';
    }
    typedRef.current = { start: s, end: e };
    if (s !== start || e !== end) {
      onChange(s, e);
    }
  };

  const onStartInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setStartText(event.target.value);
    emitTyped(event.target.value, endText);
  };

  const onEndInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setEndText(event.target.value);
    emitTyped(startText, event.target.value);
  };

  // The down arrow opens the calendar.
  const onInputKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      toggle();
    }
  };

  // A click on the box outside the two date boxes puts the cursor in Start Date.
  const onFieldMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' && !(target.closest && target.closest('button'))) {
      event.preventDefault();
      if (startRef.current) {
        startRef.current.focus();
      }
    }
  };

  const onFieldFocus = (): void => {
    setFocused(true);
  };

  const onFieldBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) {
      setFocused(false);
    }
  };

  const startIso: string | undefined = parseShortDate(startText);
  const endIso: string | undefined = parseShortDate(endText);
  const invalid: boolean =
    startIso === undefined || endIso === undefined || (!!startIso && !!endIso && endIso < startIso);
  const hasText: boolean = !!startText || !!endText;
  const floated: boolean = focused || open || hasText;
  const headerLabel: string =
    view === 'month' ? `${MONTH_SHORT[viewDate.getMonth()]} ${viewDate.getFullYear()}` : `${viewDate.getFullYear()}`;

  return (
    <div
      ref={rootRef}
      className={[
        styles.picker,
        open ? styles.isOpen : '',
        floated ? styles.isFloated : '',
        invalid && !focused ? styles.isInvalid : '',
        className || ''
      ].join(' ')}
    >
      <div
        className={styles.field}
        role="group"
        aria-labelledby={`${id}-label`}
        onMouseDown={onFieldMouseDown}
        onFocus={onFieldFocus}
        onBlur={onFieldBlur}
      >
        <label id={`${id}-label`} htmlFor={id} className={styles.label}>
          {placeholder}
        </label>
        <div className={styles.inputs}>
          {/* The start box is as wide as its text; the hidden copy in data-value sets the width. */}
          <span className={styles.sizer} data-value={startText || startPlaceholder}>
            <input
              ref={startRef}
              id={id}
              className={styles.input}
              type="text"
              size={1}
              value={startText}
              placeholder={startPlaceholder}
              aria-label={`${placeholder}, ${startPlaceholder}`}
              aria-invalid={startIso === undefined}
              autoComplete="off"
              onChange={onStartInput}
              onKeyDown={onInputKeyDown}
            />
          </span>
          <span className={[styles.separator, hasText ? '' : styles.separatorEmpty].join(' ')} aria-hidden="true">
            –
          </span>
          <input
            id={`${id}-end`}
            className={[styles.input, styles.endInput].join(' ')}
            type="text"
            size={1}
            value={endText}
            placeholder={endPlaceholder}
            aria-label={`${placeholder}, ${endPlaceholder}`}
            aria-invalid={endIso === undefined}
            autoComplete="off"
            onChange={onEndInput}
            onKeyDown={onInputKeyDown}
          />
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Open calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={onIconClick}
        >
          <Icon name="calendarFilled" size={28} />
        </button>
      </div>

      {open && (
        <div className={styles.popup} role="dialog" aria-label="Choose a date range">
          <div className={styles.header}>
            <button
              type="button"
              className={styles.periodButton}
              onClick={() => setView(view === 'month' ? 'year' : 'month')}
              aria-label="Choose month and year"
            >
              {headerLabel}
              <Icon name="caretDown" size={20} className={view === 'year' ? styles.caretUp : undefined} />
            </button>
            <div className={styles.navs}>
              <button type="button" className={styles.navButton} onClick={() => step(-1)} aria-label="Previous">
                <Icon name="chevronLeft" size={20} />
              </button>
              <button type="button" className={styles.navButton} onClick={() => step(1)} aria-label="Next">
                <Icon name="chevronRight" size={20} />
              </button>
            </div>
          </div>

          {view === 'month' ? (
            <MonthGrid
              viewDate={viewDate}
              start={start}
              end={end}
              hoverIso={hoverIso}
              todayIso={toIsoDate(today || new Date())}
              onPick={pick}
              onHover={setHoverIso}
            />
          ) : (
            <YearGrid
              viewDate={viewDate}
              today={today || new Date()}
              onPickMonth={(month: Date) => {
                setViewDate(month);
                setView('month');
              }}
            />
          )}

          {start && (
            <div className={styles.footer}>
              <button type="button" className={styles.clearButton} onClick={() => onChange('', '')}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface IMonthGridProps {
  viewDate: Date;
  start: string;
  end: string;
  hoverIso: string;
  todayIso: string;
  onPick: (iso: string) => void;
  onHover: (iso: string) => void;
}

/** The days of one month, with the selected range (or the hover preview) highlighted. */
function MonthGrid({ viewDate, start, end, hoverIso, todayIso, onPick, onHover }: IMonthGridProps): React.ReactElement {
  const offset: number = viewDate.getDay();
  const daysInMonth: number = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const previewEnd: string = start && !end && hoverIso && hoverIso >= start ? hoverIso : '';
  const rangeEnd: string = end || previewEnd;

  // Blank cells before day 1 and after the last day fill out whole weeks.
  const cells: Array<IDayCell | undefined> = [];
  for (let i: number = 0; i < offset; i++) {
    cells.push(undefined);
  }
  for (let d: number = 1; d <= daysInMonth; d++) {
    cells.push({ iso: toIsoDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), d)), day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push(undefined);
  }
  const rows: Array<Array<IDayCell | undefined>> = [];
  for (let i: number = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  const monthLabel: string = MONTH_SHORT[viewDate.getMonth()];
  const labelInFirstRow: boolean = offset >= LABEL_MIN_CELLS;

  const renderDay = (cell: IDayCell, key: number): React.ReactElement => {
    const isStart: boolean = cell.iso === start;
    const isEnd: boolean = !!rangeEnd && cell.iso === rangeEnd;
    const inRange: boolean = !!start && !!rangeEnd && cell.iso > start && cell.iso < rangeEnd;
    const classes: string[] = [styles.dayCell];
    if (inRange) {
      classes.push(end ? styles.inRange : styles.inPreview);
    }
    if (isStart && rangeEnd && rangeEnd !== start) {
      classes.push(end ? styles.rangeStart : styles.previewStart);
    }
    if (isEnd && rangeEnd !== start) {
      classes.push(end ? styles.rangeEnd : styles.previewEnd);
    }
    return (
      <td key={key} className={classes.join(' ')}>
        <button
          type="button"
          className={[
            styles.day,
            isStart || (isEnd && !!end) ? styles.selected : '',
            cell.iso === todayIso ? styles.today : ''
          ].join(' ')}
          aria-label={cell.iso}
          aria-pressed={isStart || isEnd}
          onClick={() => onPick(cell.iso)}
          onMouseEnter={() => onHover(cell.iso)}
        >
          {cell.day}
        </button>
      </td>
    );
  };

  return (
    <table className={styles.grid} role="grid">
      <thead>
        <tr>
          {WEEKDAY_LETTERS.map((w, i) => (
            <th key={i} scope="col" className={styles.weekday}>
              {w}
            </th>
          ))}
        </tr>
        <tr>
          <th colSpan={7} className={styles.divider} aria-hidden="true" />
        </tr>
      </thead>
      <tbody>
        {!labelInFirstRow && (
          <tr>
            <td colSpan={7} className={styles.monthLabel}>
              {monthLabel}
            </td>
          </tr>
        )}
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              if (cell) {
                return renderDay(cell, c);
              }
              // In the first row the leading blanks merge into one cell holding the month label.
              if (r === 0 && labelInFirstRow) {
                return c === 0 ? (
                  <td key={c} colSpan={offset} className={styles.monthLabel}>
                    {monthLabel}
                  </td>
                ) : null;
              }
              return <td key={c} />;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface IYearGridProps {
  viewDate: Date;
  today: Date;
  onPickMonth: (month: Date) => void;
}

/** The twelve months of the shown year. */
function YearGrid({ viewDate, today, onPickMonth }: IYearGridProps): React.ReactElement {
  return (
    <table className={styles.yearGrid} role="grid">
      <tbody>
        {MONTH_ROWS.map((row, r) => (
          <tr key={r}>
            {row.map((m) => {
              const date: Date = new Date(viewDate.getFullYear(), m, 1);
              return (
                <td key={m}>
                  <button
                    type="button"
                    className={[
                      styles.monthButton,
                      isSameMonth(date, viewDate) ? styles.selected : '',
                      isSameMonth(date, today) ? styles.today : ''
                    ].join(' ')}
                    onClick={() => onPickMonth(date)}
                  >
                    {MONTH_SHORT[m]}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
