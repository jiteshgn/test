import { ICourse, IFilterState, ISortState } from '../models/ICourse';
import { dayDiff, formatLongDate, timeToMinutes } from './dateUtils';
import { setToArray } from './arrayUtils';

const ZONE_LONG_NAMES: Record<string, string> = {
  ET: 'EST',
  CT: 'CST',
  MT: 'MST',
  PT: 'PST'
};

/** "01:00 PM (ET)" to { time: "01:00 PM", zone: "ET" } */
export function splitTimeAndZone(value: string): { time: string; zone: string } {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(value || '');
  if (match) {
    return { time: match[1].trim(), zone: match[2].trim() };
  }
  return { time: (value || '').trim(), zone: '' };
}

/** "01:00 PM (ET)" */
export function formatTimeWithZone(time: string, zone: string): string {
  return zone ? `${time} (${zone})` : time;
}

/** Long zone label used in the details dialog, e.g. ET to EST. */
export function zoneLongName(zone: string): string {
  return ZONE_LONG_NAMES[zone.toUpperCase()] || zone;
}

/** Number of calendar days the class runs. */
export function programDays(course: ICourse): number {
  return Math.max(1, dayDiff(course.startDate, course.endDate) + 1);
}

/** "2-Day Program (November 11, 2026 to November 12, 2026)" */
export function programLabel(course: ICourse): string {
  const days: number = programDays(course);
  if (days === 1) {
    return `1-Day Program (${formatLongDate(course.startDate)})`;
  }
  return `${days}-Day Program (${formatLongDate(course.startDate)} to ${formatLongDate(course.endDate)})`;
}

/** Splits "• one. • two." into ["one.", "two."]. */
export function splitBullets(text: string): string[] {
  return (text || '')
    .split(/\s*[••]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Splits "US, USI" into ["US", "USI"]. */
export function regionTokens(region: string): string[] {
  return (region || '')
    .split(/[,;]/)
    .map((r) => r.trim().toUpperCase())
    .filter((r) => r.length > 0);
}

/** Distinct course titles in the order they first appear. */
export function distinctTitles(courses: ICourse[]): string[] {
  const seen: Set<string> = new Set<string>();
  const result: string[] = [];
  courses.forEach((c) => {
    const key: string = normalize(c.title);
    if (c.title && !seen.has(key)) {
      seen.add(key);
      result.push(c.title);
    }
  });
  return result;
}

/** Distinct, alphabetically sorted values of a text field. */
export function distinctSorted(courses: ICourse[], field: 'region' | 'offering'): string[] {
  const values: Set<string> = new Set<string>();
  courses.forEach((c) => {
    if (c[field]) {
      values.add(c[field]);
    }
  });
  return setToArray(values).sort((a: string, b: string) => a.localeCompare(b));
}

export function normalize(value: string): string {
  return (value || '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function filterCourses(courses: ICourse[], filters: IFilterState): ICourse[] {
  const name: string = normalize(filters.courseName);
  const offering: string = normalize(filters.offering);
  const wantedRegions: string[] = regionTokens(filters.region);
  const rangeStart: string = filters.rangeStart;
  const rangeEnd: string = filters.rangeEnd || filters.rangeStart;

  return courses.filter((c) => {
    if (name && normalize(c.title).indexOf(name) === -1) {
      return false;
    }
    if (offering && normalize(c.offering) !== offering) {
      return false;
    }
    if (wantedRegions.length) {
      const tokens: string[] = regionTokens(c.region);
      if (!wantedRegions.some((r) => tokens.indexOf(r) !== -1)) {
        return false;
      }
    }
    if (rangeStart) {
      // Keep classes that overlap the chosen range.
      if (c.endDate < rangeStart || c.startDate > rangeEnd) {
        return false;
      }
    }
    return true;
  });
}

export function sortCourses(courses: ICourse[], sort: ISortState): ICourse[] {
  const factor: number = sort.direction === 'asc' ? 1 : -1;
  const sorted: ICourse[] = courses.slice();
  sorted.sort((a, b) => {
    let result: number;
    switch (sort.key) {
      case 'cpeCredits':
      case 'duration':
        result = a[sort.key] - b[sort.key];
        break;
      case 'startTime':
      case 'endTime':
        result = timeToMinutes(a[sort.key]) - timeToMinutes(b[sort.key]);
        break;
      case 'startDate':
      case 'endDate':
        result = a[sort.key].localeCompare(b[sort.key]);
        break;
      default:
        result = a[sort.key].localeCompare(b[sort.key], undefined, { sensitivity: 'base' });
    }
    if (result === 0) {
      // Array.sort is stable, so ties keep the list order (same as the source sheet).
      result = a.startDate.localeCompare(b.startDate);
    }
    return result * factor;
  });
  return sorted;
}
