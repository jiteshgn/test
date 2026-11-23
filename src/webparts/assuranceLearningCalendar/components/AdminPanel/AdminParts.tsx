import * as React from 'react';
import styles from './AdminPanel.module.scss';

/** Grey ring spinner with a caption, e.g. "Loading admin users...". */
export function Loading({ text }: { text: string }): React.ReactElement {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/** Small white spinner inside a button. */
export function ButtonSpinner(): React.ReactElement {
  return <span className={[styles.spinner, styles.spinnerSmall].join(' ')} aria-hidden="true" />;
}

export type MessageKind = 'info' | 'success' | 'error';

export interface IPanelMessage {
  kind: MessageKind;
  text: string;
  /** Extra lines, e.g. rows that could not be imported. */
  details?: string[];
}

export function Message({ message }: { message: IPanelMessage | undefined }): React.ReactElement | null {
  if (!message) {
    return null;
  }
  return (
    <div
      className={[styles.message, styles[message.kind]].join(' ')}
      role={message.kind === 'error' ? 'alert' : 'status'}
    >
      {message.text}
      {message.details && message.details.length > 0 && (
        <ul className={styles.errorList}>
          {message.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface IConfirmRequest {
  title: string;
  lines: string[];
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

/** Yes / Cancel question shown over the panel. */
export function ConfirmDialog({
  request,
  onCancel
}: {
  request: IConfirmRequest;
  onCancel: () => void;
}): React.ReactElement {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (cancelRef.current) {
      cancelRef.current.focus();
    }
  }, []);

  const confirm = (): void => {
    onCancel();
    request.onConfirm();
  };

  return (
    <div className={styles.confirmBackdrop}>
      <div className={styles.confirm} role="alertdialog" aria-modal="true" aria-label={request.title}>
        <h3>{request.title}</h3>
        {request.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <div className={styles.formButtons}>
          <button
            ref={cancelRef}
            type="button"
            className={[styles.button, styles.outline].join(' ')}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={[styles.button, request.danger ? styles.dangerSolid : styles.primary].join(' ')}
            onClick={confirm}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
