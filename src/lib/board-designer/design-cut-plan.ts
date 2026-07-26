import {
  optimize,
  type BoardGroup,
  type OptimizerOptions,
  type Part,
} from '@/lib/cut-optimizer';
import { toParts } from './to-parts';
import type { BoardDesignConfig } from './types';

/**
 * Sprint 64 / U6 — waste is applied exactly once.
 *
 * `calculateMetrics` already multiplies board feet by `config.wasteFactor` for the
 * estimate. Feeding that same factor into `optimize()` would double-count waste and
 * inflate the buy list. The packing is the more honest number (real part lengths +
 * real stock), so this path always passes `wasteFactor: 0` and lets offcut / yield
 * speak for themselves. Board-feet estimates stay on the metrics panel.
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
