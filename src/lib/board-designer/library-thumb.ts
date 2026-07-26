import { calculateMetrics } from '@/lib/board-designer/metrics';
import { layoutTopFace, type Cell } from '@/lib/board-designer/layout';
import { parseConfig } from '@/lib/board-designer/serialize';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

/**
 * Per-design cell budget for `/designer/library` thumbnails (Sprint 65).
 *
 * Editor `MAX_DRAWN_CELLS` is 5_000 for ONE live preview. The library draws N
 * designs at once, so the per-tile cap must be far smaller: 500 ≈ one-tenth of
 * the editor budget; ten at-cap tiles ≈ 5_000 rects (one editor preview). A
 * 40×60 lattice (2_400) exceeds this and must degrade — never draw a partial
 * board (wrong picture is worse than no picture).
 */
export const MAX_THUMB_CELLS = 500;

export type ThumbModel =
  | {
      kind: 'ok';
      cells: Cell[];
      widthIn: number;
      heightIn: number;
    }
  | { kind: 'placeholder'; reason: 'invalid' | 'empty' | 'too-complex' };

/**
 * Build thumbnail geometry from a stored JSON config. Never throws — library
 * page must not 500 on one bad row.
 */
export function thumbModelFromStored(configJson: unknown): ThumbModel {
  const parsed = parseConfig(configJson);
  if (!parsed.ok) return { kind: 'placeholder', reason: 'invalid' };
  return thumbModelFromConfig(parsed.config);
}

export function thumbModelFromConfig(config: BoardDesignConfig): ThumbModel {
  try {
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);
    if (cells.length === 0) {
      return { kind: 'placeholder', reason: 'empty' };
    }
    if (cells.length > MAX_THUMB_CELLS) {
      return { kind: 'placeholder', reason: 'too-complex' };
    }
    const widthIn = positiveOrOne(metrics.finishedLengthIn);
    const heightIn = positiveOrOne(metrics.finishedWidthIn);
    return { kind: 'ok', cells, widthIn, heightIn };
  } catch {
    // calculateMetrics / layoutTopFace are pure and should not throw; belt+suspenders.
    return { kind: 'placeholder', reason: 'invalid' };
  }
}

function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function placeholderLabel(reason: 'invalid' | 'empty' | 'too-complex'): string {
  switch (reason) {
    case 'invalid':
      return 'Could not read this board';
    case 'empty':
      return 'No strips to preview';
    case 'too-complex':
      return 'Too many pieces to preview';
  }
}
