import { ICourse } from '../models/ICourse';
import { addDays, endOfMonth, startOfMonth, startOfWeekMonday, toIsoDate } from './dateUtils';

export interface ICalendarSegment {
  course: ICourse;
  /** 0 = Monday ... 4 = Friday */
  startCol: number;
  endCol: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface ICalendarWeek {
  key: string;
  days: Date[];
  isoDays: string[];
  inMonth: boolean[];
  segments: ICalendarSegment[];
  laneCount: number;
}

const WORK_DAYS: number = 5;

/** Builds Monday-Friday week rows for a month, with event bars packed into lanes. */
export function buildMonthWeeks(month: Date, courses: ICourse[]): ICalendarWeek[] {
  const first: Date = startOfMonth(month);
  const last: Date = endOfMonth(month);
  const firstIso: string = toIsoDate(first);
  const lastIso: string = toIsoDate(last);
  const weeks: ICalendarWeek[] = [];

  for (let weekStart: Date = startOfWeekMonday(first); weekStart <= last; weekStart = addDays(weekStart, 7)) {
    const days: Date[] = [];
    for (let i: number = 0; i < WORK_DAYS; i++) {
      days.push(addDays(weekStart, i));
    }
    const isoDays: string[] = days.map(toIsoDate);
    const inMonth: boolean[] = isoDays.map((d) => d >= firstIso && d <= lastIso);
    if (inMonth.indexOf(true) === -1) {
      continue; // e.g. a month starting on Saturday/Sunday
    }
    const segments: ICalendarSegment[] = buildSegments(isoDays, inMonth, courses);
    const laneCount: number = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0);
    weeks.push({ key: isoDays[0], days, isoDays, inMonth, segments, laneCount });
  }
  return weeks;
}

function buildSegments(isoDays: string[], inMonth: boolean[], courses: ICourse[]): ICalendarSegment[] {
  const raw: ICalendarSegment[] = [];
  courses.forEach((course) => {
    let startCol: number = -1;
    let endCol: number = -1;
    for (let col: number = 0; col < isoDays.length; col++) {
      if (inMonth[col] && isoDays[col] >= course.startDate && isoDays[col] <= course.endDate) {
        if (startCol === -1) {
          startCol = col;
        }
        endCol = col;
      }
    }
    if (startCol === -1) {
      return;
    }
    raw.push({
      course,
      startCol,
      endCol,
      lane: 0,
      continuesBefore: course.startDate < isoDays[startCol],
      continuesAfter: course.endDate > isoDays[endCol]
    });
  });

  raw.sort((a, b) =>
    a.startCol - b.startCol ||
    (b.endCol - b.startCol) - (a.endCol - a.startCol) ||
    a.course.startTime.localeCompare(b.course.startTime));

  const laneEnds: number[] = [];
  raw.forEach((segment) => {
    let lane: number = -1;
    for (let i: number = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] < segment.startCol) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(segment.endCol);
    } else {
      laneEnds[lane] = segment.endCol;
    }
    segment.lane = lane;
  });
  return raw;
}
