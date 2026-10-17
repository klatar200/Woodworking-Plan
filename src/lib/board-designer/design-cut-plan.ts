import {
  optimize,
  STOCK_WIDTHS_IN,
  type BoardGroup,
  type OptimizerOptions,
  type Part,
} from '@/lib/cut-optimizer';
import { toParts } from './to-parts';
import type { BoardDesignConfig } from './types';

/**
 * Sprint 80: parts carry the cut sizes — `planeBuffer` is in each part's width and in the
 * end-grain length, because that is what the build guide tells you to cut and the board-feet
 * estimate buys for. Packing still charges kerf per cut and takes `endTrimIn` off each stock
 * board, and `wasteFactor` is still forced to 0 here: defects are a board-feet allowance, and
 * feeding them into `optimize()` would double-count.
 */
export type DesignCutPlanOptions = Omit<OptimizerOptions, 'wasteFactor'>;

/**
 * Build the board plan for a design: `toParts` → pack per species.
 *
 * `optimize()` groups by thickness×width only (material is display metadata). For a
 * multi-species cutting board that would pack maple and cherry onto the same stock —
 * wrong. Partition by material first, then call the shared optimizer unchanged.
 */
export function designCutPlan(
  config: BoardDesignConfig,
  options: DesignCutPlanOptions,
): BoardGroup[] {
  const parts = toParts(config);
  const byMaterial = new Map<string, Part[]>();

  for (const part of parts) {
    const key = part.material ?? '';
    const bucket = byMaterial.get(key);
    if (bucket) bucket.push(part);
    else byMaterial.set(key, [part]);
  }

  const groups: BoardGroup[] = [];
  const packOptions: OptimizerOptions = { ...options, wasteFactor: 0 };

  for (const materialParts of byMaterial.values()) {
    groups.push(...optimize(materialParts, packOptions));
  }

  return groups.sort(
    (a, b) =>
      (a.material ?? '').localeCompare(b.material ?? '') ||
      b.thicknessIn - a.thicknessIn ||
      b.widthIn - a.widthIn,
  );
}

/**
 * Default stock width for a design's cut plan: the narrowest standard width every part can be
 * ripped from. Cutting-board strips are always ripped, so "buy each part's width" (a 1 11/16″
 * hardwood stick) is never the right default. `null` when nothing fits or there are no parts.
 */
export function defaultCutPlanStockWidthIn(config: BoardDesignConfig): number | null {
  const parts = toParts(config);
  if (parts.length === 0) return null;
  const widest = Math.max(...parts.map((part) => part.widthIn));
  return STOCK_WIDTHS_IN.find((width) => width >= widest) ?? null;
}
