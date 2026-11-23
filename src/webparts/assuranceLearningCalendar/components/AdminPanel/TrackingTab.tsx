import * as React from 'react';
import styles from './AdminPanel.module.scss';
import { IVisitService } from '../../services/IAdminService';
import { exportVisitsToExcel } from '../../utils/excelExport';
import { errorMessage } from '../../utils/asyncUtils';
import { ButtonSpinner, IPanelMessage, Message } from './AdminParts';

export interface ITrackingTabProps {
  service: IVisitService;
  /** Visit tracking is switched on in the web part settings. */
  trackingOn: boolean;
}

/** Export Tracking Data: downloads the visit records as Excel. */
export function TrackingTab({ service, trackingOn }: ITrackingTabProps): React.ReactElement {
  const [busy, setBusy] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<IPanelMessage | undefined>(undefined);

  const exportAll = (): void => {
    setBusy(true);
    setMessage(undefined);
    service
      .getVisits()
      .then((visits) => {
        if (!visits.length) {
          setMessage({ kind: 'info', text: 'No visits have been recorded yet.' });
          return;
        }
        exportVisitsToExcel(visits);
        setMessage({ kind: 'success', text: `${visits.length} visit record(s) were exported.` });
      })
      .catch((e: unknown) =>
        setMessage({ kind: 'error', text: `The tracking data could not be exported. ${errorMessage(e)}` })
      )
      .then(() => setBusy(false));
  };

  return (
    <div>
      <Message message={message} />
      {!trackingOn && (
        <Message
          message={{
            kind: 'info',
            text: 'Visit tracking is switched off in the web part settings, so no new visits are recorded.'
          }}
        />
      )}

      <section className={styles.box} aria-labelledby="alc-tracking-title">
        <h3 id="alc-tracking-title" className={styles.sectionTitle}>
          Export Calendar Tracking Data
        </h3>
        <p>
          Download all calendar visit tracking data including user names, emails, visit times, and office locations.
        </p>
        <div className={[styles.message, styles.info].join(' ')}>
          <strong>Note:</strong> Large exports (100,000+ rows) may take a few moments to process.
        </div>
        <button type="button" className={[styles.button, styles.blue].join(' ')} onClick={exportAll} disabled={busy}>
          {busy && <ButtonSpinner />}
          Export All Tracking Data
        </button>
      </section>

      <section className={styles.box} aria-labelledby="alc-tracking-details">
        <h3 id="alc-tracking-details" className={styles.sectionTitle}>
          Export Details
        </h3>
        <ul>
          <li>One row per user: name, email, last visit, office location and number of visits</li>
          <li>Time spent counts only while the calendar page is open and visible</li>
          <li>Data is formatted as Excel (.xlsx) for easy analysis</li>
          <li>Large datasets are fetched in batches for optimal performance</li>
        </ul>
      </section>
    </div>
  );
}
