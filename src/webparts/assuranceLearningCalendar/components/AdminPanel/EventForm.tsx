import * as React from 'react';
import styles from './AdminPanel.module.scss';
import { ICourse } from '../../models/ICourse';
import { CourseInput } from '../../services/ICourseService';
import { importTime } from '../../utils/spreadsheetImport';
import { timeToMinutes } from '../../utils/dateUtils';
import { ButtonSpinner } from './AdminParts';

export interface IEventFormProps {
  idPrefix: string;
  /** The class being edited; undefined = new class. */
  course: ICourse | undefined;
  /** Suggestions for the free-text lists. */
  offerings: string[];
  regions: string[];
  saving: boolean;
  onSave: (course: CourseInput) => void;
  onCancel: () => void;
}

interface IFormValues {
  title: string;
  trainingType: string;
  deliveryType: string;
  startDate: string;
  endDate: string;
  startTime: string;
  startAmPm: string;
  endTime: string;
  endAmPm: string;
  timeZone: string;
  cpeCredits: string;
  duration: string;
  offering: string;
  region: string;
  registrationLink: string;
  recordedLink: string;
  aboutCourse: string;
  objectives: string;
  isActive: boolean;
}

type FormErrors = Partial<Record<keyof IFormValues, string>>;

const TIME_ZONES: string[] = ['ET', 'CT', 'MT', 'PT', 'IST'];
const TRAINING_TYPES: string[] = ['Virtual', 'In-Person'];
const MAX_LINK_LENGTH: number = 255;

/** "01:00 PM" to ["1:00", "PM"]. */
function splitTime(time: string): [string, string] {
  if (!time) {
    return ['', 'AM'];
  }
  const minutes: number = timeToMinutes(time);
  const h: number = Math.floor(minutes / 60);
  const m: number = minutes % 60;
  return [`${h % 12 || 12}:${m < 10 ? '0' : ''}${m}`, h < 12 ? 'AM' : 'PM'];
}

function toValues(course: ICourse | undefined): IFormValues {
  const c: ICourse | undefined = course;
  const [startTime, startAmPm] = splitTime(c ? c.startTime : '');
  const [endTime, endAmPm] = splitTime(c ? c.endTime : '');
  return {
    title: c ? c.title : '',
    trainingType: c ? c.trainingType : 'Virtual',
    deliveryType: c ? c.deliveryType : 'Virtual Live',
    startDate: c ? c.startDate : '',
    endDate: c ? c.endDate : '',
    startTime,
    startAmPm,
    endTime,
    endAmPm,
    timeZone: c ? c.timeZone : 'ET',
    cpeCredits: c ? String(c.cpeCredits) : '',
    duration: c ? String(c.duration) : '',
    offering: c ? c.offering : '',
    region: c ? c.region : '',
    registrationLink: c ? c.registrationLink : '',
    recordedLink: c ? c.recordedLink : '',
    aboutCourse: c ? c.aboutCourse : '',
    objectives: c ? c.objectives : '',
    isActive: c ? c.isActive !== false : true
  };
}

/** "1:30" + "PM" to "01:30 PM"; undefined when it is not a 12-hour time. */
function toTime(text: string, amPm: string): string | undefined {
  if (!/^\d{1,2}(:\d{2})?$/.test(text.trim())) {
    return undefined;
  }
  const parsed = importTime(`${text.trim()} ${amPm}`);
  return parsed && parsed.time ? parsed.time : undefined;
}

function isNumberText(text: string): boolean {
  return text.trim() === '' || (!isNaN(Number(text)) && Number(text) >= 0);
}

function validate(v: IFormValues): FormErrors {
  const errors: FormErrors = {};
  const need = (key: keyof IFormValues, label: string): void => {
    if (!String(v[key]).trim()) {
      errors[key] = `${label} is required.`;
    }
  };
  need('title', 'Event Name');
  need('trainingType', 'Training Type');
  need('startDate', 'Start Date');
  need('endDate', 'End Date');
  need('timeZone', 'Time Zone');
  need('offering', 'Offering');
  need('region', 'Region');
  if (v.startDate && v.endDate && v.endDate < v.startDate) {
    errors.endDate = 'End Date cannot be before Start Date.';
  }
  const start: string | undefined = toTime(v.startTime, v.startAmPm);
  const end: string | undefined = toTime(v.endTime, v.endAmPm);
  if (!start) {
    errors.startTime = 'Enter a time like 10:00.';
  }
  if (!end) {
    errors.endTime = 'Enter a time like 11:30.';
  }
  // Times are the daily session times, so the end is always later than the start.
  if (start && end && timeToMinutes(end) <= timeToMinutes(start)) {
    errors.endTime = 'End Time must be after Start Time.';
  }
  if (!isNumberText(v.cpeCredits)) {
    errors.cpeCredits = 'Enter a number.';
  }
  if (!isNumberText(v.duration)) {
    errors.duration = 'Enter a number of hours.';
  }
  (['registrationLink', 'recordedLink'] as Array<keyof IFormValues>).forEach((key) => {
    const link: string = String(v[key]).trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      errors[key] = 'Enter a full link starting with https://';
    } else if (link.length > MAX_LINK_LENGTH) {
      errors[key] = `Links can be at most ${MAX_LINK_LENGTH} characters.`;
    }
  });
  return errors;
}

/** Add New Event / Edit Event form of the List Manager. */
export function EventForm({
  idPrefix,
  course,
  offerings,
  regions,
  saving,
  onSave,
  onCancel
}: IEventFormProps): React.ReactElement {
  const [values, setValues] = React.useState<IFormValues>(() => toValues(course));
  const [errors, setErrors] = React.useState<FormErrors>({});
  const firstRef = React.useRef<HTMLInputElement>(null);

  // A different row was chosen for editing: start again with its values.
  React.useEffect(() => {
    setValues(toValues(course));
    setErrors({});
    if (firstRef.current) {
      firstRef.current.focus();
    }
  }, [course]);

  const set =
    (key: keyof IFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
      const target = event.target as HTMLInputElement;
      const value: string | boolean = target.type === 'checkbox' ? target.checked : target.value;
      setValues((v) => ({ ...v, [key]: value }));
      if (errors[key]) {
        setErrors((e) => ({ ...e, [key]: undefined }));
      }
    };

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const found: FormErrors = validate(values);
    setErrors(found);
    if (Object.keys(found).some((k) => !!found[k as keyof IFormValues])) {
      return;
    }
    const v: IFormValues = values;
    onSave({
      title: v.title.trim(),
      trainingType: v.trainingType.trim(),
      deliveryType: v.deliveryType.trim() || 'Virtual Live',
      startDate: v.startDate,
      endDate: v.endDate,
      startTime: toTime(v.startTime, v.startAmPm) || '',
      endTime: toTime(v.endTime, v.endAmPm) || '',
      timeZone: v.timeZone.trim(),
      cpeCredits: Number(v.cpeCredits) || 0,
      duration: Number(v.duration) || 0,
      offering: v.offering.trim(),
      region: v.region.trim(),
      registrationLink: v.registrationLink.trim(),
      recordedLink: v.recordedLink.trim(),
      aboutCourse: v.aboutCourse.trim(),
      objectives: v.objectives.trim(),
      isActive: v.isActive
    });
  };

  const id = (key: string): string => `${idPrefix}-event-${key}`;
  const cls = (key: keyof IFormValues, base: string): string => [base, errors[key] ? styles.invalid : ''].join(' ');
  const error = (key: keyof IFormValues): React.ReactNode =>
    errors[key] ? (
      <span id={id(`${key}-error`)} className={styles.fieldError}>
        {errors[key]}
      </span>
    ) : null;
  const describedBy = (key: keyof IFormValues): string | undefined => (errors[key] ? id(`${key}-error`) : undefined);

  const label = (key: string, text: string, required?: boolean): React.ReactElement => (
    <label className={styles.label} htmlFor={id(key)}>
      {text}
      {required && <span className={styles.required}> *</span>}
    </label>
  );

  const textField = (key: keyof IFormValues, text: string, required?: boolean, list?: string): React.ReactElement => (
    <div className={styles.field}>
      {label(key, text, required)}
      <input
        ref={key === 'title' ? firstRef : undefined}
        id={id(key)}
        className={cls(key, styles.input)}
        type="text"
        value={String(values[key])}
        list={list}
        autoComplete="off"
        aria-invalid={!!errors[key]}
        aria-describedby={describedBy(key)}
        onChange={set(key)}
      />
      {error(key)}
    </div>
  );

  const timeField = (
    key: 'startTime' | 'endTime',
    amPmKey: 'startAmPm' | 'endAmPm',
    text: string
  ): React.ReactElement => (
    <div className={styles.field}>
      {label(key, text, true)}
      <div className={styles.timeRow}>
        <input
          id={id(key)}
          className={cls(key, styles.input)}
          type="text"
          inputMode="numeric"
          placeholder="hh:mm"
          value={values[key]}
          aria-invalid={!!errors[key]}
          aria-describedby={describedBy(key)}
          onChange={set(key)}
        />
        <select
          className={styles.select}
          aria-label={`${text} AM or PM`}
          value={values[amPmKey]}
          onChange={set(amPmKey)}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      {error(key)}
    </div>
  );

  const list = (key: string, options: string[]): React.ReactElement => (
    <datalist id={id(`${key}-options`)}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  );

  return (
    <form className={styles.formCard} onSubmit={submit} noValidate aria-label={course ? 'Edit Event' : 'Add New Event'}>
      <h3 className={styles.formTitle}>{course ? 'Edit Event' : 'Add New Event'}</h3>
      {list('trainingType', TRAINING_TYPES)}
      {list('timeZone', TIME_ZONES)}
      {list('offering', offerings)}
      {list('region', regions)}

      <div className={styles.formGrid}>
        {textField('title', 'Event Name', true)}
        {textField('trainingType', 'Training Type', true, id('trainingType-options'))}

        <div className={styles.field}>
          {label('startDate', 'Start Date', true)}
          <input
            id={id('startDate')}
            className={cls('startDate', styles.input)}
            type="date"
            value={values.startDate}
            aria-invalid={!!errors.startDate}
            aria-describedby={describedBy('startDate')}
            onChange={set('startDate')}
          />
          {error('startDate')}
        </div>
        <div className={styles.field}>
          {label('endDate', 'End Date', true)}
          <input
            id={id('endDate')}
            className={cls('endDate', styles.input)}
            type="date"
            value={values.endDate}
            min={values.startDate || undefined}
            aria-invalid={!!errors.endDate}
            aria-describedby={describedBy('endDate')}
            onChange={set('endDate')}
          />
          {error('endDate')}
        </div>

        {timeField('startTime', 'startAmPm', 'Start Time')}
        {timeField('endTime', 'endAmPm', 'End Time')}

        {textField('timeZone', 'Time Zone', true, id('timeZone-options'))}
        {textField('deliveryType', 'Delivery Type')}
        {textField('cpeCredits', 'CPE Credits')}
        {textField('duration', 'Duration (hours)')}
        {textField('offering', 'Offering', true, id('offering-options'))}
        {textField('region', 'Region', true, id('region-options'))}
        {textField('registrationLink', 'Registration Link')}
        {textField('recordedLink', 'Recorded Link')}

        <div className={[styles.field, styles.fieldWide].join(' ')}>
          {label('aboutCourse', 'About Course')}
          <textarea
            id={id('aboutCourse')}
            className={styles.textarea}
            value={values.aboutCourse}
            onChange={set('aboutCourse')}
          />
        </div>
        <div className={[styles.field, styles.fieldWide].join(' ')}>
          {label('objectives', 'Objectives')}
          <textarea
            id={id('objectives')}
            className={styles.textarea}
            value={values.objectives}
            onChange={set('objectives')}
          />
          <span className={styles.hint}>Start each objective with a bullet (•) to show it as a list.</span>
        </div>
        <div className={[styles.field, styles.fieldWide].join(' ')}>
          <label className={styles.check}>
            <input type="checkbox" checked={values.isActive} onChange={set('isActive')} />
            Active (shown on the calendar)
          </label>
        </div>
      </div>

      <div className={styles.formButtons}>
        <button
          type="button"
          className={[styles.button, styles.outline].join(' ')}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className={[styles.button, styles.primary].join(' ')} disabled={saving}>
          {saving && <ButtonSpinner />}
          {course ? 'Update' : 'Add Event'}
        </button>
      </div>
    </form>
  );
}
