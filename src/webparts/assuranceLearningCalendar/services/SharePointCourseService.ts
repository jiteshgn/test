import { ICourse } from '../models/ICourse';
import { CourseInput, ICourseService } from './ICourseService';
import { splitTimeAndZone } from '../utils/courseUtils';
import { pad2, parseIsoDate } from '../utils/dateUtils';
import { ISPRest, SPItem, addItem, asNumber, asText, deleteItem, getAllItems, listUrl, updateItem } from './SPRest';

/** Default SharePoint list title. */
export const DEFAULT_LIST_NAME: string = 'AssuranceLearningCalendar';

/** Internal names of the list columns (see scripts/Provision-AssuranceLearningCalendarList.ps1). */
export const LIST_FIELDS: string[] = [
  'Id',
  'Title',
  'StartDate',
  'EndDate',
  'StartTime',
  'EndTime',
  'TimeZone',
  'CPECredits',
  'Duration',
  'TrainingType',
  'DeliveryType',
  'RegistrationLink',
  'AboutCourse',
  'Objectives',
  'RecordedLink',
  'Offering',
  'Region',
  'IsActive'
];

interface ISPUrlValue {
  Url?: string;
  Description?: string;
}

const DAY_MS: number = 24 * 60 * 60 * 1000;

/**
 * Reads and writes courses in the "AssuranceLearningCalendar" SharePoint list.
 * It takes a plain REST client (supplied by the web part through SPHttpClient)
 * so this file has no SPFx dependency and stays testable.
 */
export class SharePointCourseService implements ICourseService {
  private readonly _rest: ISPRest;
  private readonly _webUrl: string;
  private readonly _listName: string;
  private _bias: Promise<number | undefined> | undefined;
  /** False when the list has no IsActive column yet (created before the admin panel). */
  private _hasIsActive: boolean = true;

  constructor(rest: ISPRest, webUrl: string, listName: string = DEFAULT_LIST_NAME) {
    this._rest = rest;
    this._webUrl = webUrl.replace(/\/+$/, '');
    this._listName = listName || DEFAULT_LIST_NAME;
  }

  public get listName(): string {
    return this._listName;
  }

  public async getCourses(): Promise<ICourse[]> {
    const biasMinutes: number | undefined = await this._getSiteTimeZoneBias();
    const query = (fields: string[]): Promise<SPItem[]> =>
      getAllItems(this._rest, `${this._list()}/items?$select=${fields.join(',')}&$orderby=StartDate asc&$top=5000`);
    let items: SPItem[];
    try {
      items = await query(LIST_FIELDS);
      this._hasIsActive = true;
    } catch {
      // Older lists have no IsActive column: read without it (every class counts as active).
      items = await query(LIST_FIELDS.filter((f) => f !== 'IsActive'));
      this._hasIsActive = false;
    }
    return items.map((item) => this._mapItem(item, biasMinutes));
  }

  public async addCourse(course: CourseInput): Promise<ICourse> {
    const id: string = await addItem(this._rest, this._list(), await this._toFields(course));
    return { ...course, id };
  }

  public async updateCourse(course: ICourse): Promise<void> {
    await updateItem(this._rest, this._list(), course.id, await this._toFields(course));
  }

  public async deleteCourse(id: string): Promise<void> {
    await deleteItem(this._rest, this._list(), id);
  }

  private _list(): string {
    return listUrl(this._webUrl, this._listName);
  }

  /** Site regional bias in minutes (UTC = local + bias). Used to read and write date-only columns without day shifts. */
  private _getSiteTimeZoneBias(): Promise<number | undefined> {
    if (!this._bias) {
      this._bias = this._rest.get(`${this._webUrl}/_api/web/RegionalSettings/TimeZone?$select=Information`).then(
        (tz) => {
          const body = tz as { Information?: { Bias?: number }; d?: { Information?: { Bias?: number } } };
          const info = body.Information || (body.d && body.d.Information);
          return info && typeof info.Bias === 'number' ? info.Bias : undefined;
        },
        () => undefined
      );
    }
    return this._bias;
  }

  /** List column values for a class. */
  private async _toFields(course: CourseInput): Promise<SPItem> {
    const bias: number | undefined = await this._getSiteTimeZoneBias();
    const fields: SPItem = {
      Title: course.title,
      StartDate: toSharePointDate(course.startDate, bias),
      EndDate: toSharePointDate(course.endDate || course.startDate, bias),
      StartTime: course.startTime,
      EndTime: course.endTime,
      TimeZone: course.timeZone,
      CPECredits: course.cpeCredits,
      Duration: course.duration,
      TrainingType: course.trainingType,
      DeliveryType: course.deliveryType,
      RegistrationLink: toUrlValue(course.registrationLink),
      AboutCourse: course.aboutCourse,
      Objectives: course.objectives,
      RecordedLink: toUrlValue(course.recordedLink),
      Offering: course.offering,
      Region: course.region
    };
    if (course.isActive === false && !this._hasIsActive) {
      throw new Error(
        `The "${this._listName}" list has no IsActive column yet. Run the provisioning script again to add it.`
      );
    }
    if (this._hasIsActive) {
      fields.IsActive = course.isActive !== false;
    }
    return fields;
  }

  private _mapItem(item: SPItem, biasMinutes: number | undefined): ICourse {
    const start: string = toIsoDate(item.StartDate, biasMinutes);
    const end: string = toIsoDate(item.EndDate, biasMinutes) || start;
    const startParts = splitTimeAndZone(asText(item.StartTime));
    const endParts = splitTimeAndZone(asText(item.EndTime));
    const recorded: string = asUrl(item.RecordedLink);

    return {
      id: String(item.Id),
      title: asText(item.Title),
      startDate: start,
      endDate: end,
      startTime: startParts.time,
      endTime: endParts.time,
      timeZone: asText(item.TimeZone) || startParts.zone,
      cpeCredits: asNumber(item.CPECredits),
      duration: asNumber(item.Duration),
      trainingType: asText(item.TrainingType) || 'Virtual',
      deliveryType: asText(item.DeliveryType) || 'Virtual Live',
      registrationLink: asUrl(item.RegistrationLink),
      aboutCourse: asText(item.AboutCourse),
      objectives: asText(item.Objectives),
      recordedLink: recorded.toUpperCase() === 'NA' ? '' : recorded,
      offering: asText(item.Offering),
      region: asText(item.Region),
      // Empty (column added later, old items) counts as active.
      isActive: item.IsActive === false ? false : true
    };
  }
}

function asUrl(value: unknown): string {
  if (value && typeof value === 'object') {
    return asText((value as ISPUrlValue).Url);
  }
  return asText(value);
}

/** Hyperlink column value; null clears it. */
function toUrlValue(url: string): ISPUrlValue | null {
  const value: string = (url || '').trim();
  return value ? { Url: value, Description: value.substring(0, 255) } : null;
}

/**
 * Date-only column value: midnight of that day on the site's clock (standard time), as UTC.
 * Daylight saving can only move it to 01:00 the same day, and reading rounds to the nearest day.
 */
function toSharePointDate(iso: string, biasMinutes: number | undefined): string {
  const d: Date = parseIsoDate(iso);
  const ms: number = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) + (biasMinutes || 0) * 60000;
  return new Date(ms).toISOString();
}

/**
 * SharePoint returns date-only values as UTC instants of local midnight on the site.
 * Shift by the site bias and round to the nearest day, so daylight saving never moves the date.
 */
function toIsoDate(value: unknown, biasMinutes: number | undefined): string {
  const raw: string = asText(value);
  if (!raw) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const ms: number = Date.parse(raw);
  if (isNaN(ms)) {
    return '';
  }
  const localMs: number = biasMinutes === undefined ? ms : ms - biasMinutes * 60000;
  const day: Date = new Date(Math.round(localMs / DAY_MS) * DAY_MS);
  const y: number = day.getUTCFullYear();
  const m: string = pad2(day.getUTCMonth() + 1);
  const d: string = pad2(day.getUTCDate());
  return `${y}-${m}-${d}`;
}
