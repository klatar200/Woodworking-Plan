import type { Strip } from '@/lib/board-designer/types';

export function stripDisplayName(strip: Pick<Strip, 'label'>, index: number): string {
  const label = strip.label?.trim();
  return label ? label : `Strip ${index + 1}`;
}
