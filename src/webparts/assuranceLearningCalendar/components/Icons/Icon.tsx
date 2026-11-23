import * as React from 'react';

export type IconName =
  | 'check'
  | 'refresh'
  | 'arrowUp'
  | 'calendar'
  | 'calendarFilled'
  | 'chevronLeft'
  | 'chevronRight'
  | 'caretDown'
  | 'close'
  | 'external'
  | 'pencil'
  | 'trash'
  | 'eye'
  | 'eyeOff'
  | 'folder'
  | 'download'
  | 'plus';

export interface IIconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const PATHS: Record<IconName, React.ReactNode> = {
  check: <polyline points="5 12.5 10 17 19 7.5" />,
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <polyline points="19.8 4.5 19.8 8.6 15.7 8.6" />
    </>
  ),
  arrowUp: (
    <>
      <line x1="12" y1="19.5" x2="12" y2="5" />
      <polyline points="6.5 10.5 12 5 17.5 10.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.2" />
      <line x1="4" y1="9.5" x2="20" y2="9.5" />
      <line x1="8.5" y1="3.5" x2="8.5" y2="7" />
      <line x1="15.5" y1="3.5" x2="15.5" y2="7" />
      <rect x="7.5" y="12.5" width="3.5" height="3.5" fill="currentColor" stroke="none" />
    </>
  ),
  // Solid calendar (green date range button).
  calendarFilled: (
    <>
      <rect x="3" y="3.5" width="18" height="17.5" rx="2.5" fill="currentColor" stroke="none" />
      <rect x="5.5" y="8.5" width="13" height="10" rx="0.8" fill="#fff" stroke="none" />
      <rect x="7.5" y="10.5" width="4" height="3.5" rx="0.4" fill="currentColor" stroke="none" />
    </>
  ),
  chevronLeft: <polyline points="15 5 8 12 15 19" />,
  chevronRight: <polyline points="9 5 16 12 9 19" />,
  caretDown: <polygon points="7 10 12 15 17 10" fill="currentColor" stroke="none" />,
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" />
      <line x1="13.5" y1="7" x2="16.5" y2="10" />
    </>
  ),
  trash: (
    <>
      <polyline points="4 7 20 7" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6 7l1 13h10l1-13" />
      <line x1="10" y1="11" x2="10" y2="16.5" />
      <line x1="14" y1="11" x2="14" y2="16.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5C18.4 5.5 22 12 22 12a17 17 0 0 1-3 3.8M14.1 14.2a3 3 0 0 1-4.3-4.3" />
      <path d="M6.6 6.7C3.7 8.4 2 12 2 12s3.6 6.5 10 6.5a9.7 9.7 0 0 0 4.4-1" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </>
  ),
  folder: (
    <path
      d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"
      fill="currentColor"
      stroke="none"
    />
  ),
  download: (
    <>
      <line x1="12" y1="4" x2="12" y2="15" />
      <polyline points="7 10.5 12 15.5 17 10.5" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  external: (
    <>
      <path d="M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5" />
      <polyline points="14 4 20 4 20 10" />
      <line x1="10.5" y1="13.5" x2="20" y2="4" />
    </>
  )
};

/** Inline SVG icon set (no icon-font dependency). */
export const Icon = React.memo(function Icon({
  name,
  size = 24,
  className,
  strokeWidth = 2
}: IIconProps): React.ReactElement {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
});
