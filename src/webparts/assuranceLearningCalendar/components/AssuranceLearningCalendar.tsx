import * as React from 'react';
import styles from './AssuranceLearningCalendar.module.scss';
import { IAssuranceLearningCalendarProps } from './IAssuranceLearningCalendarProps';
import { CourseSortKey, DEFAULT_SORT, EMPTY_FILTERS, ICourse, IFilterState, ISortState } from '../models/ICourse';
import { useCourses } from '../hooks/useCourses';
import { DESIGN_WIDTH, useFitToWidth } from '../hooks/useFitToWidth';
import { HeroBanner } from './HeroBanner/HeroBanner';
import { Filters } from './Filters/Filters';
import { CourseTable } from './CourseTable/CourseTable';
import { MonthCalendar } from './MonthCalendar/MonthCalendar';
import { CourseModal } from './CourseModal/CourseModal';
import { AdminPanel } from './AdminPanel/AdminPanel';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useVisitTracking } from '../hooks/useVisitTracking';
import { IAdminAccess } from '../models/IAdmin';
import { distinctSorted, distinctTitles, filterCourses, sortCourses } from '../utils/courseUtils';
import { addMonths, parseIsoDate, startOfMonth, toIsoDate } from '../utils/dateUtils';
import { exportCoursesToExcel } from '../utils/excelExport';

let idCounter: number = 0;

/** Default width of each side bar, % of the web part width. */
export const DEFAULT_SIDE_GUTTER: number = 6;

/**
 * The month the calendar should show after Apply:
 * the month of the date range, else the next matching class (or the last one if all are past), else today.
 */
function monthToShow(applied: IFilterState, filtered: ICourse[], today: Date): Date {
  if (applied.rangeStart) {
    return startOfMonth(parseIsoDate(applied.rangeStart));
  }
  if (filtered.length && (applied.courseName || applied.region || applied.offering)) {
    const todayIso: string = toIsoDate(today);
    const upcoming: ICourse | undefined = filtered.filter((c) => c.endDate >= todayIso)[0];
    const target: ICourse = upcoming || filtered[filtered.length - 1];
    return startOfMonth(parseIsoDate(target.startDate));
  }
  return startOfMonth(today);
}

/**
 * The whole web part: banner, filters, course table, month calendar and the details dialog.
 *
 * Filters work in two steps: the dropdowns edit `draft`, and Apply copies it to `applied`,
 * which is what the table and calendar use.
 */
const AssuranceLearningCalendar = React.memo(function AssuranceLearningCalendar(
  props: IAssuranceLearningCalendarProps
): React.ReactElement {
  const { dataService, dataKey, title, questionsLinkText, questionsLinkUrl, contactEmail, heroImageUrl, tableHeight } =
    props;

  // "Same look on every screen resolution": scale the whole page to the screen width (see useFitToWidth).
  const frameRef = React.useRef<HTMLDivElement>(null);
  const scale: number | undefined = useFitToWidth(frameRef, {
    enabled: props.fitToWidth !== false,
    sideGutterPercent: props.sideGutter === undefined ? DEFAULT_SIDE_GUTTER : props.sideGutter
  });

  // Values fixed for the life of the component (created once, on first render).
  const [idPrefix] = React.useState<string>(() => `alc${++idCounter}`);
  const [today] = React.useState<Date>(() => props.today || new Date());

  /* ---------- state ---------- */

  /** Bumped after the admin panel changes events, to load them again. */
  const [dataVersion, setDataVersion] = React.useState<number>(0);
  const { loading, error, courses: allCourses } = useCourses(dataService, `${dataKey}|${dataVersion}`);
  /** Inactive events (made inactive in the admin panel) are hidden from the page. */
  const courses: ICourse[] = React.useMemo(() => allCourses.filter((c) => c.isActive !== false), [allCourses]);
  /** Filter values being edited (not yet applied). */
  const [draft, setDraft] = React.useState<IFilterState>(EMPTY_FILTERS);
  /** Filter values in use (set by Apply / Reset). */
  const [applied, setApplied] = React.useState<IFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = React.useState<ISortState>(DEFAULT_SORT);
  /** id of the table row that is expanded, '' for none. */
  const [expandedId, setExpandedId] = React.useState<string>('');
  /** Course shown in the details dialog. */
  const [selectedCourse, setSelectedCourse] = React.useState<ICourse | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => startOfMonth(today));
  /** Bumped by Reset so the filter boxes also drop text that is half typed. */
  const [resetCount, setResetCount] = React.useState<number>(0);

  /* ---------- admin panel and visit tracking ---------- */

  const { currentUser, adminService, visitService } = props;
  /** Bumped after admin users change, to read the current user's access again. */
  const [accessVersion, setAccessVersion] = React.useState<number>(0);
  const access: IAdminAccess = useAdminAccess(adminService, currentUser, accessVersion);
  const [adminOpen, setAdminOpen] = React.useState<boolean>(false);
  useVisitTracking(visitService, currentUser, props.trackVisits !== false);

  const onOpenAdmin = React.useCallback((): void => setAdminOpen(true), []);
  const onCloseAdmin = React.useCallback((): void => setAdminOpen(false), []);
  const onCoursesChanged = React.useCallback((): void => setDataVersion((n) => n + 1), []);
  const onAdminsChanged = React.useCallback((): void => setAccessVersion((n) => n + 1), []);
  const showAdmin: boolean = access.isAdmin && !!adminService && !!visitService && !!currentUser;

  /* ---------- derived data (recalculated only when its inputs change) ---------- */

  const courseNames: string[] = React.useMemo(() => distinctTitles(courses), [courses]);
  const regions: string[] = React.useMemo(() => distinctSorted(courses, 'region'), [courses]);
  const offerings: string[] = React.useMemo(() => distinctSorted(courses, 'offering'), [courses]);
  /** Classes matching the applied filters (list order). Used by the calendar. */
  const filtered: ICourse[] = React.useMemo(() => filterCourses(courses, applied), [courses, applied]);
  /** The same classes in the table's sort order. Used by the table and Export. */
  const sorted: ICourse[] = React.useMemo(() => sortCourses(filtered, sort), [filtered, sort]);

  /* ---------- filter handlers ---------- */

  const onCourseNameChange = React.useCallback((courseName: string): void => {
    setDraft((d) => ({ ...d, courseName }));
  }, []);

  const onRegionChange = React.useCallback((region: string): void => {
    setDraft((d) => ({ ...d, region }));
  }, []);

  const onOfferingChange = React.useCallback((offering: string): void => {
    setDraft((d) => ({ ...d, offering }));
  }, []);

  const onDateRangeChange = React.useCallback((rangeStart: string, rangeEnd: string): void => {
    setDraft((d) => ({ ...d, rangeStart, rangeEnd }));
  }, []);

  const onApply = React.useCallback((): void => {
    setApplied(draft);
    setExpandedId('');
    setCalendarMonth(monthToShow(draft, filterCourses(courses, draft), today));
  }, [draft, courses, today]);

  const onReset = React.useCallback((): void => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setResetCount((n) => n + 1);
    setSort(DEFAULT_SORT);
    setExpandedId('');
    setCalendarMonth(startOfMonth(today));
  }, [today]);

  const onExport = React.useCallback((): void => {
    exportCoursesToExcel(sorted);
  }, [sorted]);

  /* ---------- table handlers ---------- */

  // Clicking the sorted column again flips the direction; another column starts ascending.
  const onSort = React.useCallback((key: CourseSortKey): void => {
    setSort((current) =>
      current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
    );
  }, []);

  const onToggleRow = React.useCallback((id: string): void => {
    setExpandedId((current) => (current === id ? '' : id));
  }, []);

  /* ---------- calendar handlers ---------- */

  const onPrevMonth = React.useCallback((): void => {
    setCalendarMonth((m) => addMonths(m, -1));
  }, []);

  const onNextMonth = React.useCallback((): void => {
    setCalendarMonth((m) => addMonths(m, 1));
  }, []);

  const onCurrentMonth = React.useCallback((): void => {
    setCalendarMonth(startOfMonth(today));
  }, [today]);

  const onCloseModal = React.useCallback((): void => {
    setSelectedCourse(undefined);
  }, []);

  /* ---------- render ---------- */

  const rootStyle: React.CSSProperties | undefined = scale ? { width: DESIGN_WIDTH, zoom: scale } : undefined;

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      style={scale && props.gutterColor ? { background: props.gutterColor } : undefined}
    >
      <div className={[styles.root, scale ? styles.fitted : ''].join(' ')} style={rootStyle}>
        <div className={styles.page}>
          <HeroBanner
            title={title}
            questionsLinkText={questionsLinkText}
            questionsLinkUrl={questionsLinkUrl}
            imageUrl={heroImageUrl}
          />

          <Filters
            key={resetCount}
            idPrefix={idPrefix}
            courseNames={courseNames}
            regions={regions}
            offerings={offerings}
            filters={draft}
            today={props.today}
            exportDisabled={loading || sorted.length === 0}
            onCourseNameChange={onCourseNameChange}
            onRegionChange={onRegionChange}
            onOfferingChange={onOfferingChange}
            onDateRangeChange={onDateRangeChange}
            onApply={onApply}
            onReset={onReset}
            onExport={onExport}
            onAdmin={showAdmin ? onOpenAdmin : undefined}
          />

          <CourseTable
            courses={sorted}
            sort={sort}
            expandedId={expandedId}
            loading={loading}
            error={error}
            maxHeight={tableHeight}
            onSort={onSort}
            onToggle={onToggleRow}
          />

          <MonthCalendar
            month={calendarMonth}
            courses={filtered}
            today={today}
            onPrev={onPrevMonth}
            onNext={onNextMonth}
            onCurrent={onCurrentMonth}
            onSelectCourse={setSelectedCourse}
          />
        </div>

        {selectedCourse && (
          <CourseModal course={selectedCourse} contactEmail={contactEmail} scale={scale} onClose={onCloseModal} />
        )}

        {adminOpen && showAdmin && adminService && visitService && currentUser && (
          <AdminPanel
            idPrefix={idPrefix}
            courseService={dataService}
            adminService={adminService}
            visitService={visitService}
            currentUser={currentUser}
            access={access}
            targetLabel={props.importTargetLabel || 'the calendar list'}
            trackingOn={props.trackVisits !== false}
            scale={scale}
            onCoursesChanged={onCoursesChanged}
            onAdminsChanged={onAdminsChanged}
            onClose={onCloseAdmin}
          />
        )}
      </div>
    </div>
  );
});

export default AssuranceLearningCalendar;
