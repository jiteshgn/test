import * as React from 'react';
import styles from './AdminPanel.module.scss';
import { ICourse } from '../../models/ICourse';
import { ICourseService } from '../../services/ICourseService';
import { IImportResult, IImportRow, readSpreadsheet, rowsToCourses } from '../../utils/spreadsheetImport';
import { downloadImportTemplate, exportAllCoursesToExcel } from '../../utils/excelExport';
import { errorMessage, runWithLimit } from '../../utils/asyncUtils';
import { Icon } from '../Icons/Icon';
import { ButtonSpinner, IConfirmRequest, IPanelMessage, Message } from './AdminParts';

export interface IExcelImportTabProps {
  service: ICourseService;
  /** "the AssuranceLearningCalendar SharePoint list" */
  targetLabel: string;
  isSuperAdmin: boolean;
  onChanged: () => void;
  confirm: (request: IConfirmRequest) => void;
}

interface IPreview {
  fileName: string;
  result: IImportResult;
  /** Rows to import (valid and not already in the list). */
  toImport: IImportRow[];
  /** Rows matching an event that is already in the list. */
  duplicates: IImportRow[];
}

interface IProgress {
  label: string;
  done: number;
  total: number;
}

/** Parallel requests for bulk changes (keeps SharePoint from throttling). */
const BULK_LIMIT: number = 4;

/** Same event: same name, start date and start time. */
function eventKey(c: { title: string; startDate: string; startTime: string }): string {
  return [c.title.trim().toLowerCase(), c.startDate, c.startTime.trim().toUpperCase()].join('|');
}

/** Excel Import: import events from .xlsx / .csv; export all data; delete all data (Super Admins). */
export function ExcelImportTab({
  service,
  targetLabel,
  isSuperAdmin,
  onChanged,
  confirm
}: IExcelImportTabProps): React.ReactElement {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<IPreview | undefined>(undefined);
  const [progress, setProgress] = React.useState<IProgress | undefined>(undefined);
  /** Reading a file or exporting. */
  const [busy, setBusy] = React.useState<string>('');
  const [message, setMessage] = React.useState<IPanelMessage | undefined>(undefined);
  const working: boolean = !!busy || !!progress;

  const chooseFile = (): void => {
    if (fileRef.current) {
      fileRef.current.value = '';
      fileRef.current.click();
    }
  };

  const onFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = event.target.files ? event.target.files[0] : undefined;
    if (!file) {
      return;
    }
    setMessage(undefined);
    setPreview(undefined);
    setBusy('read');
    Promise.all([readSpreadsheet(file), service.getCourses()])
      .then(([rows, existing]) => {
        const result: IImportResult = rowsToCourses(rows);
        const known: Record<string, boolean> = {};
        existing.forEach((c: ICourse) => {
          known[eventKey(c)] = true;
        });
        const toImport: IImportRow[] = [];
        const duplicates: IImportRow[] = [];
        result.rows.forEach((row) => {
          const key: string = eventKey(row.course);
          if (known[key]) {
            duplicates.push(row);
          } else {
            known[key] = true;
            toImport.push(row);
          }
        });
        setPreview({ fileName: file.name, result, toImport, duplicates });
      })
      .catch((e: unknown) => setMessage({ kind: 'error', text: `The file could not be read. ${errorMessage(e)}` }))
      .then(() => setBusy(''));
  };

  const runImport = (): void => {
    if (!preview) {
      return;
    }
    const rows: IImportRow[] = preview.toImport;
    setMessage(undefined);
    setProgress({ label: 'Importing', done: 0, total: rows.length });
    runWithLimit(
      rows,
      BULK_LIMIT,
      (row) => service.addCourse(row.course),
      (done, total) => setProgress({ label: 'Importing', done, total })
    ).then((failures) => {
      setProgress(undefined);
      setPreview(undefined);
      const added: number = rows.length - failures.length;
      setMessage({
        kind: failures.length ? 'error' : 'success',
        text: failures.length
          ? `${added} of ${rows.length} event(s) were imported. ${failures.length} could not be saved:`
          : `${added} event(s) were imported into ${targetLabel}.`,
        details: failures.map((f) => `Row ${rows[f.index].rowNumber}: ${f.message}`)
      });
      if (added) {
        onChanged();
      }
    });
  };

  const exportAll = (): void => {
    setMessage(undefined);
    setBusy('export');
    service
      .getCourses()
      .then((courses) => {
        exportAllCoursesToExcel(courses.slice().sort((a, b) => a.startDate.localeCompare(b.startDate)));
        setMessage({ kind: 'success', text: `${courses.length} event(s) were exported.` });
      })
      .catch((e: unknown) => setMessage({ kind: 'error', text: `The data could not be exported. ${errorMessage(e)}` }))
      .then(() => setBusy(''));
  };

  const deleteAll = (): void => {
    setMessage(undefined);
    setBusy('count');
    service
      .getCourses()
      .then((courses) => {
        setBusy('');
        if (!courses.length) {
          setMessage({ kind: 'info', text: 'There are no events to delete.' });
          return;
        }
        confirm({
          title: 'Delete all data?',
          lines: [
            `All ${courses.length} event(s) in ${targetLabel} will be deleted, active and inactive.`,
            'They go to the SharePoint recycle bin. Use Export Data first if you may need them again.'
          ],
          confirmLabel: `Delete ${courses.length} event(s)`,
          danger: true,
          onConfirm: () => {
            setProgress({ label: 'Deleting', done: 0, total: courses.length });
            runWithLimit(
              courses,
              BULK_LIMIT,
              (c) => service.deleteCourse(c.id),
              (done, total) => setProgress({ label: 'Deleting', done, total })
            ).then((failures) => {
              setProgress(undefined);
              setMessage({
                kind: failures.length ? 'error' : 'success',
                text: failures.length
                  ? `${courses.length - failures.length} event(s) were deleted; ${failures.length} could not be deleted.`
                  : `All ${courses.length} event(s) were deleted.`,
                details: failures.map((f) => `${courses[f.index].title}: ${f.message}`)
              });
              onChanged();
            });
          }
        });
      })
      .catch((e: unknown) => {
        setBusy('');
        setMessage({ kind: 'error', text: `The events could not be read. ${errorMessage(e)}` });
      });
  };

  return (
    <div>
      <Message message={message} />

      <section className={styles.step} aria-labelledby="alc-import-step1">
        <h3 id="alc-import-step1" className={styles.sectionTitle}>
          Step 1: Import Events
        </h3>
        <ol className={styles.steps}>
          <li>
            Download the{' '}
            <button type="button" className={styles.link} onClick={downloadImportTemplate}>
              reference Excel sheet
            </button>{' '}
            for the correct column format (the same columns as Export Excel).
          </li>
          <li>
            Select an <strong>Excel (.xlsx)</strong> or <strong>CSV (.csv)</strong> file to import events. Dates can be
            dd-mm-yyyy, yyyy-mm-dd or Excel dates; times like 10:00 AM (ET).
          </li>
          <li>
            All valid rows will be imported directly into <em>{targetLabel}</em>. Rows that are already in the list are
            skipped.
          </li>
        </ol>
        <input
          ref={fileRef}
          className={styles.hiddenFile}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={onFile}
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={[styles.button, styles.primary].join(' ')}
            onClick={chooseFile}
            disabled={working}
          >
            {busy === 'read' ? <ButtonSpinner /> : <Icon name="folder" size={18} className={styles.folderIcon} />}
            Choose File (.xlsx / .csv)
          </button>
        </div>

        {preview && (
          <div className={styles.preview}>
            <p>
              <strong>{preview.fileName}</strong>: {preview.toImport.length} event(s) ready to import.
              {preview.duplicates.length > 0 && ` ${preview.duplicates.length} already in the list (skipped).`}
              {preview.result.errors.length > 0 && ` ${preview.result.errors.length} row(s) have problems (skipped):`}
            </p>
            {preview.result.errors.length > 0 && (
              <ul className={styles.errorList}>
                {preview.result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            <div className={styles.formButtons}>
              <button
                type="button"
                className={[styles.button, styles.outline].join(' ')}
                onClick={() => setPreview(undefined)}
                disabled={working}
              >
                Cancel
              </button>
              <button
                type="button"
                className={[styles.button, styles.primary].join(' ')}
                onClick={runImport}
                disabled={working || preview.toImport.length === 0}
              >
                Import {preview.toImport.length} event(s)
              </button>
            </div>
          </div>
        )}

        {progress && (
          <div aria-live="polite">
            <div className={styles.progress}>
              <div
                className={styles.progressBar}
                style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
              />
            </div>
            {progress.label} {progress.done} of {progress.total}…
          </div>
        )}
      </section>

      <section className={styles.step} aria-labelledby="alc-import-step2">
        <h3 id="alc-import-step2" className={styles.sectionTitle}>
          Step 2: Manage Data
        </h3>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={[styles.button, styles.outline].join(' ')}
            onClick={exportAll}
            disabled={working}
          >
            {busy === 'export' ? <ButtonSpinner /> : <Icon name="download" size={18} />}
            Export Data
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              className={[styles.button, styles.danger].join(' ')}
              onClick={deleteAll}
              disabled={working}
            >
              <Icon name="trash" size={18} />
              Delete All Data
            </button>
          )}
        </div>
        <p className={styles.hint}>
          Export Data saves every event, active and inactive, with a Status column; that file can be imported again.
          {!isSuperAdmin && ' Only Super Admins can delete data.'}
        </p>
      </section>
    </div>
  );
}
