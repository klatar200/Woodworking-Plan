import type { MiterCorner } from './types';

/**
 * Shop-language vocabulary for mitered strips — the strip editor, the print sheet and the build
 * guide all read it from here, so one corner can never be worded two ways (Sprint 80, the same
 * rule `ROW_TRANSFORM_LABELS` applies to row placements).
 *
 * Corners follow the top-face diagram axes (layout.ts), never the orbit camera.
 */
export const MITER_CORNER_LABELS: Record<MiterCorner, string> = {
  tl: 'Top left',
  tr: 'Top right',
  bl: 'Bottom left',
  br: 'Bottom right',
};

/**
 * Miter angle for a builder: whole degrees, or a half written as `½`. Never a decimal point —
 * the guide's no-decimals rule covers every number on it, and a miter saw reads 22½ as well as 22.5.
 */
export function formatMiterAngle(deg: number): string {
  const halves = Math.round(deg * 2);
  const whole = Math.floor(halves / 2);
  return halves % 2 === 0 ? `${whole}°` : `${whole}½°`;
}

/**
 * How a mitered strip is made — the composite method. Shared by the print sheet's note and the
 * build guide's `make-composite-strips` step.
 */
export const MITER_COMPOSITE_METHOD =
  'Mitered strips are ripped at an angle and glued to a contrasting wedge. One rip yields two composite strips (A-base/B-wedge and B-base/A-wedge).';
