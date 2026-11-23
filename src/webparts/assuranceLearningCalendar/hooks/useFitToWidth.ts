import * as React from 'react';

/** Width the page is laid out at before it is scaled, px. Above 1400px the full desktop design applies. */
export const DESIGN_WIDTH: number = 1440;

/** Below this web part width at 100% zoom (px) the page stops scaling and uses its normal responsive layout. */
export const FIT_MIN_WIDTH: number = 768;

export interface IFitToWidthOptions {
  /** Turn the scaling on or off. */
  enabled: boolean;
  /** Side bar on each side at 100% browser zoom, as a percentage of the screen width (0–20; 0 = no bars, full width at any zoom). */
  sideGutterPercent: number;
}

/**
 * "Same look on every screen resolution".
 *
 * The page is always laid out DESIGN_WIDTH px wide and then scaled (CSS `zoom`) so that, at 100% browser
 * zoom, it is the screen width minus the two side bars. A 1416px and a 2416px screen therefore show the
 * same picture.
 *
 * The target width is based on `screen.width`, which browser zoom does not change (Chrome / Edge), so the
 * browser zoom still works as usual: zooming out makes the page smaller and the side bars wider, zooming in
 * makes the page bigger and the side bars narrower, until the page fills the web part.
 *
 * With the side bars set to 0 the page always fills the web part, so it looks the same at every zoom level.
 *
 * Returns the scale to apply, or undefined when scaling is off or the web part is too narrow
 * (phones and narrow SharePoint columns keep the responsive layout). Once the page fills the web part,
 * zooming in further keeps it the same size on screen.
 */
export function useFitToWidth(
  frameRef: React.RefObject<HTMLElement>,
  { enabled, sideGutterPercent }: IFitToWidthOptions
): number | undefined {
  const [scale, setScale] = React.useState<number | undefined>(undefined);

  // Layout effect: measure before the browser paints, so the unscaled page never flashes.
  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!enabled || !frame) {
      setScale(undefined);
      return;
    }

    const gutter: number = Math.max(0, Math.min(20, sideGutterPercent || 0));
    const measure = (): void => {
      const width: number = frame.clientWidth;
      const viewport: number = document.documentElement.clientWidth || window.innerWidth || width;
      const screenWidth: number = (window.screen && window.screen.width) || viewport;
      // Width of the web part as it would be at 100% zoom (its share of the window × the screen width).
      // Zooming in does not change it, so high zoom never switches to the phone layout; only a small
      // screen or a narrow SharePoint column does.
      const widthAt100: number = screenWidth * Math.min(1, width / viewport);
      if (widthAt100 < FIT_MIN_WIDTH) {
        setScale(undefined);
        return;
      }
      // No side bars (0%): always fill the web part, so every zoom level looks the same.
      // With side bars: size from the screen width, never wider than the web part
      // (zoomed in far enough, the side bars are gone).
      const pageWidth: number = gutter === 0 ? width : Math.min(width, screenWidth * (1 - (2 * gutter) / 100));
      // Round down slightly so rounding never causes a horizontal scrollbar.
      setScale(Math.floor((pageWidth / DESIGN_WIDTH) * 10000) / 10000);
    };

    measure();
    // The web part width changes with browser zoom and window size; the screen width when the
    // window moves to another monitor (that also fires a window resize).
    window.addEventListener('resize', measure);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(frame);
    }
    return () => {
      window.removeEventListener('resize', measure);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [frameRef, enabled, sideGutterPercent]);

  return scale;
}
