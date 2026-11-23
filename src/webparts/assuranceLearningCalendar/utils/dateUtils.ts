export const MONTH_NAMES: string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT: string[] = MONTH_NAMES.map((m) => m.substring(0, 3).toUpperCase());

export const WEEKDAY_NAMES: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Two-digit, zero-padded number (String.padStart needs the ES2017 lib, which SPFx does not include). */
export function pad2(value: number | string): string {
  const s: string = String(value);
  return s.length < 2 ? `0${s}` : s;
}

/** Parses YYYY-MM-DD as a local calendar date. */
export function parseIsoDate(iso: string): Date {
  const parts: number[] = iso.split('-').map((p) => parseInt(p, 10));
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

export function toIsoDate(date: Date): string {
  const m: string = pad2(date.getMonth() + 1);
  const d: string = pad2(date.getDate());
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "22-01-2026" (Excel export format) to "2026-01-22". */
export function ddmmyyyyToIso(value: string): string {
  const parts: string[] = value.trim().split(/[-/.]/);
  if (parts.length !== 3) {
    return '';
  }
  return `${parts[2]}-${pad2(parts[1])}-${pad2(parts[0])}`;
}

/** "2026-01-22" to "22-01-2026" (Excel export format). */
export function isoToDdmmyyyy(iso: string): string {
  const p: string[] = iso.split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso;
}

/** "January 22, 2026" */
export function formatLongDate(iso: string): string {
  if (!iso) {
    return '';
  }
  const d: Date = parseIsoDate(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "1/22/2026" */
export function formatShortDate(iso: string): string {
  if (!iso) {
    return '';
  }
  const d: Date = parseIsoDate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * Typed date "1/22/2026" (month/day/year; "/", "-" or "." between) to "2026-01-22".
 * Returns '' for an empty box and undefined when the text is not a real date.
 */
export function parseShortDate(text: string): string | undefined {
  const value: string = (text || '').trim();
  if (!value) {
    return '';
  }
  const match: RegExpExecArray | null = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const month: number = parseInt(match[1], 10);
  const day: number = parseInt(match[2], 10);
  const year: number = parseInt(match[3], 10);
  const date: Date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return toIsoDate(date);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Monday of the week that contains the date. */
export function startOfWeekMonday(date: Date): Date {
  const offset: number = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Whole calendar days from a to b (b - a). */
export function dayDiff(aIso: string, bIso: string): number {
  const a: Date = parseIsoDate(aIso);
  const b: Date = parseIsoDate(bIso);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}

/** "01:00 PM" to minutes after midnight, for sorting. */
export function timeToMinutes(time: string): number {
  const match = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(time);
  if (!match) {
    return 0;
  }
  let hours: number = parseInt(match[1], 10) % 12;
  if (match[3] && match[3].toUpperCase() === 'PM') {
    hours += 12;
  }
  return hours * 60 + parseInt(match[2], 10);
}
