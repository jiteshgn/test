import * as React from 'react';
import styles from './PillButton.module.scss';
import { Icon, IconName } from '../Icons/Icon';

export interface IPillButtonProps {
  label: string;
  icon: IconName;
  variant?: 'primary' | 'dark';
  href?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

function discClass(icon: IconName): string {
  switch (icon) {
    case 'check':
      return styles.discCheck;
    case 'refresh':
      return styles.discRefresh;
    default:
      return styles.discDefault;
  }
}

/** Rounded green action button with a white icon disc on the right (Apply / Reset / Export Excel). */
export const PillButton = React.memo(function PillButton({
  label,
  icon,
  variant = 'primary',
  href,
  disabled,
  className,
  onClick
}: IPillButtonProps): React.ReactElement {
  const classes: string = [styles.pill, variant === 'dark' ? styles.dark : '', className || ''].join(' ');
  const content: React.ReactNode = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={[styles.disc, discClass(icon)].join(' ')}>
        <Icon name={icon} size={22} strokeWidth={icon === 'check' ? 1.6 : 2.2} />
      </span>
    </>
  );

  if (href) {
    return (
      <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={classes} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  );
});
