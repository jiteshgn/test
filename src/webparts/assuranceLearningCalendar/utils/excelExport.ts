import { ICourse } from '../models/ICourse';
import { IVisitRecord } from '../models/IAdmin';
import { formatTimeWithZone } from './courseUtils';
import { isoToDdmmyyyy, pad2 } from './dateUtils';

/**
 * Dependency-free .xlsx export. Writes a real Office Open XML workbook
 * (stored zip, no compression). Courses use the same columns as the source Excel sheet,
 * so an exported file can be imported again in the admin panel.
 */

export type SheetValue = string | number;

export interface ISheetColumn<T> {
  header: string;
  width: number;
  value: (row: T) => SheetValue;
}

export const COURSE_COLUMNS: Array<ISheetColumn<ICourse>> = [
  { header: 'eventName', width: 46, value: (c) => c.title },
  { header: 'startDateString', width: 16, value: (c) => isoToDdmmyyyy(c.startDate) },
  { header: 'endDateString', width: 16, value: (c) => isoToDdmmyyyy(c.endDate) },
  { header: 'startTime', width: 15, value: (c) => formatTimeWithZone(c.startTime, c.timeZone) },
  { header: 'endTime', width: 15, value: (c) => formatTimeWithZone(c.endTime, c.timeZone) },
  { header: 'CPECredits', width: 10, value: (c) => c.cpeCredits },
  { header: 'Tduration', width: 10, value: (c) => c.duration },
  { header: 'trainingType', width: 13, value: (c) => c.trainingType },
  { header: 'timeZone', width: 10, value: (c) => c.timeZone },
  { header: 'RegistrationLink', width: 60, value: (c) => c.registrationLink },
  { header: 'AboutCourse', width: 60, value: (c) => c.aboutCourse },
  { header: 'Objectives', width: 70, value: (c) => c.objectives },
  { header: 'recordedLink', width: 40, value: (c) => c.recordedLink || 'NA' },
  { header: 'offering', width: 32, value: (c) => c.offering },
  { header: 'Region', width: 10, value: (c) => c.region }
];

/** Extra column in the admin export: Active / Inactive (read back by the import). */
const STATUS_COLUMN: ISheetColumn<ICourse> = {
  header: 'Status',
  width: 10,
  value: (c) => (c.isActive === false ? 'Inactive' : 'Active')
};

/** Visible classes, as shown on the page (Export Excel button). */
export function exportCoursesToExcel(courses: ICourse[], fileName?: string): void {
  downloadBlob(buildXlsx(COURSE_COLUMNS, courses), fileName || `ExcelFile_export_${Date.now()}.xlsx`);
}

/** Every class in the list, with its Active / Inactive status (admin panel). */
export function exportAllCoursesToExcel(courses: ICourse[]): void {
  downloadBlob(buildXlsx(COURSE_COLUMNS.concat([STATUS_COLUMN]), courses), `CalendarData_${fileStamp()}.xlsx`);
}

/** Reference sheet for the Excel import: the import columns and one sample row. */
export function downloadImportTemplate(): void {
  const sample: ICourse = {
    id: '',
    title: 'Sample Event',
    startDate: '2026-05-20',
    endDate: '2026-05-20',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    timeZone: 'ET',
    cpeCredits: 1,
    duration: 1,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: 'https://example.com/register',
    aboutCourse: 'Short course description',
    objectives: '• First objective • Second objective',
    recordedLink: '',
    offering: 'Internal Audit',
    region: 'US'
  };
  downloadBlob(buildXlsx(COURSE_COLUMNS, [sample]), 'calendar-import-reference.xlsx');
}

/** Visit tracking data (admin panel). */
export function exportVisitsToExcel(visits: IVisitRecord[]): void {
  const columns: Array<ISheetColumn<IVisitRecord>> = [
    { header: 'ID', width: 6, value: (v) => Number(v.id) || v.id },
    { header: 'User Name', width: 32, value: (v) => v.userName },
    { header: 'Email', width: 34, value: (v) => v.email },
    { header: 'Last Visited', width: 22, value: (v) => v.lastVisited.replace(/\.\d{3}Z$/, 'Z') },
    { header: 'Location', width: 20, value: (v) => v.location },
    { header: 'Visits', width: 8, value: (v) => v.visits },
    { header: 'Time Spent (HH:MM:SS)', width: 22, value: (v) => formatDuration(v.timeSpentSeconds) },
    { header: 'Time Spent (Seconds)', width: 20, value: (v) => v.timeSpentSeconds }
  ];
  downloadBlob(buildXlsx(columns, visits), `calendar-tracking-data-${fileStamp()}.xlsx`);
}

/** 3725 to "01:02:05". */
export function formatDuration(totalSeconds: number): string {
  const s: number = Math.max(0, Math.round(totalSeconds || 0));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

/** "2026-11-23T06-11-51" (local time), for file names. */
function fileStamp(): string {
  const d: Date = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`
  );
}

export function downloadBlob(blob: Blob, name: string): void {
  const nav = window.navigator as Navigator & { msSaveOrOpenBlob?: (b: Blob, n: string) => void };
  if (nav.msSaveOrOpenBlob) {
    nav.msSaveOrOpenBlob(blob, name);
    return;
  }
  const url: string = URL.createObjectURL(blob);
  const anchor: HTMLAnchorElement = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A one-sheet workbook with a styled, frozen, filterable header row. */
export function buildXlsx<T>(columns: Array<ISheetColumn<T>>, rows: T[]): Blob {
  const files: Array<{ name: string; content: string }> = [
    { name: '[Content_Types].xml', content: contentTypesXml() },
    { name: '_rels/.rels', content: rootRelsXml() },
    { name: 'xl/workbook.xml', content: workbookXml(columns.length) },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml() },
    { name: 'xl/styles.xml', content: stylesXml() },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml(columns, rows) }
  ];
  const encoder: TextEncoder = new TextEncoder();
  const zip: Uint8Array = createStoredZip(files.map((f) => ({ name: f.name, data: encoder.encode(f.content) })));
  return new Blob([zip as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/* ---------- worksheet ---------- */

function columnLetter(index: number): string {
  let n: number = index + 1;
  let s: string = '';
  while (n > 0) {
    const r: number = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function cellXml(ref: string, value: string | number, style: number): string {
  if (typeof value === 'number') {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function sheetXml<T>(columns: Array<ISheetColumn<T>>, data: T[]): string {
  const lastCol: string = columnLetter(columns.length - 1);
  const lastRow: number = data.length + 1;
  const cols: string = columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('');
  const header: string = `<row r="1">${columns.map((c, i) => cellXml(`${columnLetter(i)}1`, c.header, 1)).join('')}</row>`;
  const rows: string = data
    .map((item, r) => {
      const rowNum: number = r + 2;
      const cells: string = columns.map((c, i) => cellXml(`${columnLetter(i)}${rowNum}`, c.value(item), 2)).join('');
      return `<row r="${rowNum}">${cells}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<dimension ref="A1:${lastCol}${lastRow}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${header}${rows}</sheetData>` +
    `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
    '</worksheet>'
  );
}

function contentTypesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>'
  );
}

function rootRelsXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'
  );
}

function workbookXml(columnCount: number): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' +
    '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">' +
    `Sheet1!$A$1:$${columnLetter(columnCount - 1)}$1</definedName></definedNames>` +
    '</workbook>'
  );
}

function workbookRelsXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>'
  );
}

function stylesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F8FA6"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2">' +
    '<border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FF9BC2CC"/></left><right style="thin"><color rgb="FF9BC2CC"/></right>' +
    '<top style="thin"><color rgb="FF9BC2CC"/></top><bottom style="thin"><color rgb="FF9BC2CC"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

/* ---------- minimal zip (store) writer ---------- */

let crcTable: Uint32Array | undefined;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n: number = 0; n < 256; n++) {
      let c: number = n;
      for (let k: number = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc: number = 0xffffffff;
  for (let i: number = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder: TextEncoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset: number = 0;
  // 2026-01-01 00:00 in DOS format
  const dosTime: number = 0;
  const dosDate: number = ((2026 - 1980) << 9) | (1 << 5) | 1;

  entries.forEach((entry) => {
    const nameBytes: Uint8Array = encoder.encode(entry.name);
    const crc: number = crc32(entry.data);
    const size: number = entry.data.length;

    const local: DataView = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    localParts.push(new Uint8Array(local.buffer), nameBytes, entry.data);

    const central: DataView = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, offset, true);
    centralParts.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + size;
  });

  const centralSize: number = centralParts.reduce((sum, p) => sum + p.length, 0);
  const end: DataView = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts: Uint8Array[] = [...localParts, ...centralParts, new Uint8Array(end.buffer)];
  const total: number = parts.reduce((sum, p) => sum + p.length, 0);
  const out: Uint8Array = new Uint8Array(total);
  let pos: number = 0;
  parts.forEach((p) => {
    out.set(p, pos);
    pos += p.length;
  });
  return out;
}
