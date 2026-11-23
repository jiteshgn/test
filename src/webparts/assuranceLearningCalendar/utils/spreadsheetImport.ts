import { CourseInput } from '../services/ICourseService';
import { splitTimeAndZone } from './courseUtils';
import { pad2, toIsoDate } from './dateUtils';

/**
 * Reads an Excel (.xlsx) or CSV file in the browser (no library) and turns its rows into classes.
 * .xlsx files are zip archives; compressed parts are unpacked with the browser's DecompressionStream.
 */

export type Cell = string | number;

export interface IImportRow {
  /** Row number in the sheet (1 = header). */
  rowNumber: number;
  course: CourseInput;
}

export interface IImportResult {
  rows: IImportRow[];
  /** "Row 4: Start Date is missing." */
  errors: string[];
}

export async function readSpreadsheet(file: File): Promise<Cell[][]> {
  const name: string = file.name.toLowerCase();
  if (/\.csv$/.test(name)) {
    return parseCsv(await file.text());
  }
  if (/\.xlsx$/.test(name)) {
    return readXlsx(new Uint8Array(await file.arrayBuffer()));
  }
  throw new Error('Choose an Excel (.xlsx) or CSV (.csv) file.');
}

/* ---------- CSV ---------- */

/** RFC 4180 CSV (quoted fields, "" escapes, line breaks inside quotes). Semicolons work too. */
export function parseCsv(text: string): Cell[][] {
  const source: string = text.charAt(0) === '﻿' ? text.substring(1) : text;
  const firstLine: string = source.split(/\r?\n/)[0] || '';
  const delimiter: string = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let field: string = '';
  let quoted: boolean = false;

  for (let i: number = 0; i < source.length; i++) {
    const ch: string = source.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (source.charAt(i + 1) === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source.charAt(i + 1) === '\n') {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ---------- XLSX ---------- */

interface IZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readZip(bytes: Uint8Array): Record<string, IZipEntry> {
  const view: DataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory: the last record with this signature.
  let eocd: number = -1;
  for (let i: number = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('The file is not a valid .xlsx workbook.');
  }
  const count: number = view.getUint16(eocd + 10, true);
  let pos: number = view.getUint32(eocd + 16, true);
  const decoder: TextDecoder = new TextDecoder('utf-8');
  const entries: Record<string, IZipEntry> = {};
  for (let n: number = 0; n < count; n++) {
    if (view.getUint32(pos, true) !== 0x02014b50) {
      break;
    }
    const nameLength: number = view.getUint16(pos + 28, true);
    const extraLength: number = view.getUint16(pos + 30, true);
    const commentLength: number = view.getUint16(pos + 32, true);
    const name: string = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    entries[name] = {
      method: view.getUint16(pos + 10, true),
      compressedSize: view.getUint32(pos + 20, true),
      localOffset: view.getUint32(pos + 42, true)
    };
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

type DecompressionStreamConstructor = new (format: string) => {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Decompression: DecompressionStreamConstructor | undefined = (
    window as unknown as { DecompressionStream?: DecompressionStreamConstructor }
  ).DecompressionStream;
  if (!Decompression) {
    throw new Error('This browser cannot open .xlsx files. Save the sheet as CSV (UTF-8) and import that instead.');
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new Decompression('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipText(bytes: Uint8Array, entries: Record<string, IZipEntry>, name: string): Promise<string> {
  const entry: IZipEntry | undefined = entries[name];
  if (!entry) {
    return '';
  }
  const view: DataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start: number =
    entry.localOffset +
    30 +
    view.getUint16(entry.localOffset + 26, true) +
    view.getUint16(entry.localOffset + 28, true);
  const raw: Uint8Array = bytes.subarray(start, start + entry.compressedSize);
  const data: Uint8Array = entry.method === 8 ? await inflateRaw(raw) : raw;
  return new TextDecoder('utf-8').decode(data);
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

/** Elements by local name, with or without a namespace prefix. */
function byName(parent: Document | Element, localName: string): Element[] {
  const list: HTMLCollectionOf<Element> = parent.getElementsByTagNameNS('*', localName);
  const out: Element[] = [];
  for (let i: number = 0; i < list.length; i++) {
    out.push(list[i]);
  }
  return out;
}

/** Text of a shared string / inline string (joins rich-text runs, skips phonetic hints). */
function stringItemText(item: Element): string {
  return byName(item, 't')
    .filter((t) => !t.parentElement || t.parentElement.localName !== 'rPh')
    .map((t) => t.textContent || '')
    .join('');
}

/** "BC12" to column index 54. */
function columnIndex(ref: string): number {
  const letters: string = (/^[A-Z]+/i.exec(ref) || [''])[0].toUpperCase();
  let index: number = 0;
  for (let i: number = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

/** Rows of the first worksheet. */
async function readXlsx(bytes: Uint8Array): Promise<Cell[][]> {
  const entries: Record<string, IZipEntry> = readZip(bytes);

  // Find the first sheet's file through the workbook relationships.
  let sheetPath: string = 'xl/worksheets/sheet1.xml';
  const workbook: Document = parseXml(await readZipText(bytes, entries, 'xl/workbook.xml'));
  const firstSheet: Element | undefined = byName(workbook, 'sheet')[0];
  const relId: string = firstSheet
    ? firstSheet.getAttribute('r:id') ||
      firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
      ''
    : '';
  if (relId) {
    const rels: Document = parseXml(await readZipText(bytes, entries, 'xl/_rels/workbook.xml.rels'));
    byName(rels, 'Relationship').forEach((rel) => {
      if (rel.getAttribute('Id') === relId) {
        const target: string = rel.getAttribute('Target') || '';
        sheetPath = target.charAt(0) === '/' ? target.substring(1) : `xl/${target.replace(/^\.\//, '')}`;
      }
    });
  }

  const sharedText: string = await readZipText(bytes, entries, 'xl/sharedStrings.xml');
  const shared: string[] = sharedText ? byName(parseXml(sharedText), 'si').map(stringItemText) : [];

  const sheetText: string = await readZipText(bytes, entries, sheetPath);
  if (!sheetText) {
    throw new Error('The workbook has no worksheet.');
  }
  const rows: Cell[][] = [];
  byName(parseXml(sheetText), 'row').forEach((rowEl, i) => {
    const rowIndex: number = (parseInt(rowEl.getAttribute('r') || '', 10) || i + 1) - 1;
    const cells: Cell[] = [];
    byName(rowEl, 'c').forEach((c, j) => {
      const ref: string = c.getAttribute('r') || '';
      const col: number = ref ? columnIndex(ref) : j;
      const type: string = c.getAttribute('t') || 'n';
      const vEl: Element | undefined = byName(c, 'v')[0];
      const v: string = vEl ? vEl.textContent || '' : '';
      let value: Cell = '';
      if (type === 's') {
        value = shared[parseInt(v, 10)] || '';
      } else if (type === 'inlineStr') {
        const is: Element | undefined = byName(c, 'is')[0];
        value = is ? stringItemText(is) : '';
      } else if (type === 'str') {
        value = v;
      } else if (type === 'b') {
        value = v === '1' ? 'TRUE' : 'FALSE';
      } else if (type === 'e') {
        value = '';
      } else {
        value = v === '' ? '' : parseFloat(v);
      }
      cells[col] = value;
    });
    for (let k: number = 0; k < cells.length; k++) {
      if (cells[k] === undefined) {
        cells[k] = '';
      }
    }
    rows[rowIndex] = cells;
  });
  for (let r: number = 0; r < rows.length; r++) {
    if (!rows[r]) {
      rows[r] = [];
    }
  }
  return rows;
}

/* ---------- rows to classes ---------- */

type CourseField = keyof CourseInput | 'status';

/** Accepted header names (lower case, letters and digits only) for each field. */
const HEADER_ALIASES: Record<string, CourseField> = {
  eventname: 'title',
  event: 'title',
  title: 'title',
  coursetitle: 'title',
  coursename: 'title',
  startdatestring: 'startDate',
  startdate: 'startDate',
  enddatestring: 'endDate',
  enddate: 'endDate',
  starttime: 'startTime',
  starttimings: 'startTime',
  endtime: 'endTime',
  endtimings: 'endTime',
  timezone: 'timeZone',
  cpecredits: 'cpeCredits',
  cpe: 'cpeCredits',
  tduration: 'duration',
  duration: 'duration',
  durationhours: 'duration',
  trainingtype: 'trainingType',
  deliverytype: 'deliveryType',
  registrationlink: 'registrationLink',
  aboutcourse: 'aboutCourse',
  objectives: 'objectives',
  recordedlink: 'recordedLink',
  offering: 'offering',
  offerings: 'offering',
  region: 'region',
  status: 'status'
};

/** SharePoint hyperlink columns hold at most 255 characters. */
const MAX_LINK_LENGTH: number = 255;

function headerKey(value: Cell): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cellText(value: Cell | undefined): string {
  return value === undefined ? '' : String(value).trim();
}

/**
 * Turns sheet rows (first non-empty row = headers) into classes.
 * Rows with problems are left out and listed in `errors`.
 */
export function rowsToCourses(rows: Cell[][]): IImportResult {
  let headerIndex: number = 0;
  while (headerIndex < rows.length && !rows[headerIndex].some((c) => cellText(c) !== '')) {
    headerIndex++;
  }
  const headers: Cell[] = rows[headerIndex] || [];
  const columns: Partial<Record<CourseField, number>> = {};
  headers.forEach((h, i) => {
    const field: CourseField | undefined = HEADER_ALIASES[headerKey(h)];
    if (field && columns[field] === undefined) {
      columns[field] = i;
    }
  });
  if (columns.title === undefined || columns.startDate === undefined) {
    throw new Error(
      'The sheet needs a header row with at least "eventName" and "startDateString". Use the reference Excel sheet.'
    );
  }

  const result: IImportResult = { rows: [], errors: [] };
  for (let r: number = headerIndex + 1; r < rows.length; r++) {
    const row: Cell[] = rows[r];
    if (!row.some((c) => cellText(c) !== '')) {
      continue;
    }
    const get = (field: CourseField): Cell | undefined => {
      const index: number | undefined = columns[field];
      return index === undefined ? undefined : row[index];
    };
    const problems: string[] = [];
    const rowNumber: number = r + 1;

    const title: string = cellText(get('title'));
    if (!title) {
      problems.push('Event Name is missing');
    }
    const startDate: string | undefined = importDate(get('startDate'));
    if (!startDate) {
      problems.push(
        startDate === '' ? 'Start Date is missing' : `Start Date "${cellText(get('startDate'))}" is not a date`
      );
    }
    const endRaw: string | undefined = importDate(get('endDate'));
    if (endRaw === undefined) {
      problems.push(`End Date "${cellText(get('endDate'))}" is not a date`);
    }
    const endDate: string = endRaw || startDate || '';
    if (startDate && endDate && endDate < startDate) {
      problems.push('End Date is before Start Date');
    }
    const start: ITimeValue | undefined = importTime(get('startTime'));
    const end: ITimeValue | undefined = importTime(get('endTime'));
    if (!start) {
      problems.push(`Start Time "${cellText(get('startTime'))}" is not a time`);
    }
    if (!end) {
      problems.push(`End Time "${cellText(get('endTime'))}" is not a time`);
    }
    const links: string[] = [cleanLink(get('registrationLink')), cleanLink(get('recordedLink'))];
    if (links[0].length > MAX_LINK_LENGTH || links[1].length > MAX_LINK_LENGTH) {
      problems.push(`a link is longer than ${MAX_LINK_LENGTH} characters`);
    }

    if (problems.length) {
      result.errors.push(`Row ${rowNumber}: ${problems.join('; ')}.`);
      continue;
    }
    const timeZone: string = cellText(get('timeZone')) || (start && start.zone) || (end && end.zone) || '';
    result.rows.push({
      rowNumber,
      course: {
        title,
        startDate: startDate || '',
        endDate,
        startTime: start ? start.time : '',
        endTime: end ? end.time : '',
        timeZone,
        cpeCredits: importNumber(get('cpeCredits')),
        duration: importNumber(get('duration')),
        trainingType: cellText(get('trainingType')) || 'Virtual',
        deliveryType: cellText(get('deliveryType')) || 'Virtual Live',
        registrationLink: links[0],
        aboutCourse: cellText(get('aboutCourse')),
        objectives: cellText(get('objectives')),
        recordedLink: links[1],
        offering: cellText(get('offering')),
        region: cellText(get('region')),
        isActive: cellText(get('status')).toLowerCase() !== 'inactive'
      }
    });
  }
  return result;
}

function cleanLink(value: Cell | undefined): string {
  const text: string = cellText(value);
  return text.toUpperCase() === 'NA' || text.toUpperCase() === 'N/A' ? '' : text;
}

function importNumber(value: Cell | undefined): number {
  const n: number = typeof value === 'number' ? value : parseFloat(cellText(value));
  return isNaN(n) ? 0 : n;
}

/**
 * Date cell to ISO: Excel date numbers, yyyy-mm-dd, dd-mm-yyyy (the Export Excel format),
 * or text like "January 22, 2026". '' when empty, undefined when not a date.
 * d/m vs m/d: a part above 12 decides; otherwise day first, as in the Export Excel file.
 */
export function importDate(value: Cell | undefined): string | undefined {
  if (typeof value === 'number') {
    // Excel serial date: days since 1899-12-30.
    const ms: number = Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000;
    const d: Date = new Date(ms);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  const text: string = cellText(value);
  if (!text) {
    return '';
  }
  let y: number;
  let m: number;
  let d: number;
  let match: RegExpExecArray | null = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(text);
  if (match) {
    y = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
    d = parseInt(match[3], 10);
  } else {
    match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
    if (match) {
      const a: number = parseInt(match[1], 10);
      const b: number = parseInt(match[2], 10);
      y = parseInt(match[3], 10);
      if (b > 12 && a <= 12) {
        m = a;
        d = b;
      } else {
        d = a;
        m = b;
      }
    } else {
      const ms: number = Date.parse(text);
      if (isNaN(ms)) {
        return undefined;
      }
      return toIsoDate(new Date(ms));
    }
  }
  const date: Date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined;
  }
  return toIsoDate(date);
}

interface ITimeValue {
  /** "01:00 PM", or '' when the cell is empty. */
  time: string;
  /** Zone written in brackets, e.g. "ET" from "01:00 PM (ET)". */
  zone: string;
}

/** "1:00 pm", "13:00", "01:00 PM (ET)" or an Excel time number to "01:00 PM". undefined when not a time. */
export function importTime(value: Cell | undefined): ITimeValue | undefined {
  if (typeof value === 'number') {
    const minutes: number = Math.round((value - Math.floor(value)) * 1440) % 1440;
    return { time: formatMinutes(minutes), zone: '' };
  }
  const parts = splitTimeAndZone(cellText(value));
  if (!parts.time) {
    return { time: '', zone: parts.zone };
  }
  const match = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*([ap])\.?\s*m?\.?$/i.exec(parts.time);
  if (match) {
    const hours: number = parseInt(match[1], 10);
    const mins: number = match[2] ? parseInt(match[2], 10) : 0;
    if (hours < 1 || hours > 12 || mins > 59) {
      return undefined;
    }
    const pm: boolean = match[3].toLowerCase() === 'p';
    return { time: formatMinutes(((hours % 12) + (pm ? 12 : 0)) * 60 + mins), zone: parts.zone };
  }
  const h24 = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(parts.time);
  if (h24) {
    const hours: number = parseInt(h24[1], 10);
    const mins: number = parseInt(h24[2], 10);
    if (hours > 23 || mins > 59) {
      return undefined;
    }
    return { time: formatMinutes(hours * 60 + mins), zone: parts.zone };
  }
  return undefined;
}

/** 780 to "01:00 PM". */
export function formatMinutes(minutes: number): string {
  const h: number = Math.floor(minutes / 60) % 24;
  const m: number = minutes % 60;
  return `${pad2(h % 12 || 12)}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
