import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styles from './CourseModal.module.scss';
import { ICourse } from '../../models/ICourse';
import { formatLongDate } from '../../utils/dateUtils';
import { splitBullets, zoneLongName } from '../../utils/courseUtils';
import { Icon } from '../Icons/Icon';
import { PillButton } from '../Filters/PillButton';

export interface ICourseModalProps {
  course: ICourse;
  contactEmail: string;
  /** Scale of the page when it is fitted to the web part width, so the dialog matches it. */
  scale?: number;
  onClose: () => void;
}

/**
 * Session details dialog opened from a calendar event.
 * The parent renders it only while a course is selected, so mounting = open and unmounting = closed.
 */
export const CourseModal = React.memo(function CourseModal({
  course,
  contactEmail,
  scale,
  onClose
}: ICourseModalProps): React.ReactElement {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // On open: stop the page scrolling and focus the close button.
  // On close: restore the scrolling and give focus back to whatever had it before.
  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | undefined;
    const previousOverflow: string = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) {
      closeRef.current.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.focus) {
        previousFocus.focus();
      }
    };
  }, []);

  // Escape closes the dialog.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // A click on the dark backdrop (not inside the dialog) closes it.
  const onBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const titleId: string = `alc-modal-title-${course.id}`;
  const zone: string = zoneLongName(course.timeZone);
  const objectives: string[] = splitBullets(course.objectives);

  // Rendered into <body> so it sits above everything on the SharePoint page.
  return ReactDOM.createPortal(
    <div className={styles.backdrop} onMouseDown={onBackdropMouseDown}>
      <div
        className={styles.dialog}
        style={scale ? { zoom: scale } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {course.title}
          </h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="close" size={26} strokeWidth={1.8} />
          </button>
          <svg className={styles.wave} viewBox="0 0 1300 70" preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.waveBand} d="M0,8 C180,50 360,64 620,58 C880,52 1080,30 1300,22 L1300,70 L0,70 Z" />
            <path
              className={styles.waveFill}
              d="M0,40 C220,66 520,60 760,46 C980,34 1140,26 1300,30 L1300,70 L0,70 Z"
            />
          </svg>
        </div>

        <div className={styles.body}>
          <div className={styles.session}>
            <h3 className={styles.sectionTitle}>Session Details:</h3>
            <dl className={styles.facts}>
              <dt>Start Date:</dt>
              <dd>{formatLongDate(course.startDate)}</dd>
              <dt>End Date:</dt>
              <dd>{formatLongDate(course.endDate)}</dd>
              <dt>Time:</dt>
              <dd>
                {course.startTime}–{course.endTime}
                {zone ? ` (${zone})` : ''}
              </dd>
              <dt>Duration:</dt>
              <dd>
                {course.duration} {course.duration === 1 ? 'hour' : 'hours'}
              </dd>
              <dt>CPE Credits:</dt>
              <dd>{course.cpeCredits}</dd>
              <dt>Delivery Type:</dt>
              <dd>{course.deliveryType}</dd>
              <dt>Region:</dt>
              <dd>{course.region}</dd>
            </dl>
          </div>

          <div className={styles.about}>
            <h3 className={styles.sectionTitle}>About the Course:</h3>
            <div className={styles.aboutScroll} tabIndex={0}>
              <p>{course.aboutCourse || 'Details will be published soon.'}</p>
              {objectives.length > 0 && (
                <>
                  <h4 className={styles.subTitle}>Objectives:</h4>
                  <ul>
                    {objectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.contact}>
            Trouble in registering? Contact:{' '}
            <a href={`mailto:${contactEmail}`} className={styles.contactLink}>
              {contactEmail}
            </a>
          </p>
          {course.registrationLink && (
            <PillButton label="More Information" icon="arrowUp" href={course.registrationLink} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});
