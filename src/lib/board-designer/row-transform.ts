import type { RowTransform } from './types';

/** Shop-language labels for row transforms — UI and print sheet. */
export const ROW_TRANSFORM_LABELS: Record<RowTransform, string> = {
  none: 'As cut',
  rot180: 'Turned end-for-end',
  mirrorX: 'Flipped over',
  mirrorY: 'Flipped top to bottom',
};

export const ROW_TRANSFORMS = Object.keys(ROW_TRANSFORM_LABELS) as RowTransform[];
