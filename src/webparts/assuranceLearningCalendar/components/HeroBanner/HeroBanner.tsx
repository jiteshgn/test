import * as React from 'react';
import styles from './HeroBanner.module.scss';
import { HeroArt } from './HeroArt';

export interface IHeroBannerProps {
  title: string;
  questionsLinkText: string;
  questionsLinkUrl: string;
  /** Optional photo for the right side; a vector illustration is used when empty. */
  imageUrl?: string;
}

/** Page banner: title, intro text, questions link and artwork. */
export const HeroBanner = React.memo(function HeroBanner({
  title,
  questionsLinkText,
  questionsLinkUrl,
  imageUrl
}: IHeroBannerProps): React.ReactElement {
  const isMail: boolean = /^mailto:/i.test(questionsLinkUrl);

  return (
    <header className={styles.hero}>
      <div className={styles.art} aria-hidden={!imageUrl}>
        {imageUrl ? (
          <img className={styles.artImage} src={imageUrl} alt="" />
        ) : (
          <HeroArt className={styles.artImage} />
        )}
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>
          Welcome to the Assurance virtual learning calendar. This calendar can be filtered to identify classes by
          course title, date range, and region or used to view all classes within a particular month. To register
          for or learn more about a specific class, click the <strong>More Information</strong> button.
        </p>
        <p className={styles.text}>
          Questions can be directed to{' '}
          <a
            className={styles.link}
            href={questionsLinkUrl}
            target={isMail ? undefined : '_blank'}
            rel={isMail ? undefined : 'noopener noreferrer'}
          >
            {questionsLinkText}
          </a>
          .
        </p>
      </div>

      <svg className={styles.wave} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
        <path
          className={styles.waveBand}
          d="M0,26 C150,96 320,138 540,138 C820,136 1100,92 1440,66 L1440,160 L0,160 Z"
        />
        <path
          className={styles.waveGlow}
          d="M0,120 C260,138 560,116 820,92 C1060,70 1260,58 1440,70 L1440,160 L0,160 Z"
        />
        <path
          className={styles.waveFill}
          d="M0,152 C260,152 560,124 820,98 C1060,76 1260,66 1440,82 L1440,160 L0,160 Z"
        />
      </svg>
    </header>
  );
});
