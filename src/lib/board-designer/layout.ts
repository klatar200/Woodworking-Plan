import { getSpecies, UNKNOWN_SPECIES_COLOR } from './species';
import type {
  BoardDesignConfig,
  BoardMetrics,
  Panel,
  RowTransform,
  Strip,
} from './types';

export interface Cell {
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
  colorHex: string;
  speciesId: string;
}

/** Expand strip.repeat into one entry per physical strip (left → right / top → bottom). */
export function expandStrips(strips: Strip[]): Strip[] {
  const out: Strip[] = [];
  for (const s of strips) {
    for (let i = 0; i < s.repeat; i++) {
      out.push(s);
    }
  }
  return out;
}

function colorFor(speciesId: string): string {
  return getSpecies(speciesId)?.colorHex ?? UNKNOWN_SPECIES_COLOR;
}

/**
 * Apply a row transform to an expanded strip list.
 * rot180 / mirrorX reverse; none / mirrorY leave order.
 */
export function applyRowTransform(strips: Strip[], transform: RowTransform): Strip[] {
  if (transform === 'rot180' || transform === 'mirrorX') {
    return strips.slice().reverse();
  }
  return strips.slice();
}

/**
 * Top-face cell layout for SVG + 3D. Origin top-left; x along finishedLengthIn,
 * y along finishedWidthIn. Pure and deterministic.
 *
 * edge: panels[0] strips stacked down y; row height = panel thickness.
 * end:  rowPattern cycled to rowCount; y accumulates per-row panel thickness.
 */
export function layoutTopFace(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): Cell[] {
  if (config.grain === 'edge') {
    const panel = config.panels[0];
    if (!panel) return [];
    const expanded = expandStrips(panel.strips);
    const cells: Cell[] = [];
    let y = 0;
    for (const s of expanded) {
      cells.push({
        xIn: 0,
        yIn: y,
        wIn: metrics.finishedLengthIn,
        hIn: s.widthIn,
        colorHex: colorFor(s.speciesId),
        speciesId: s.speciesId,
      });
      y += s.widthIn;
    }
    return cells;
  }

  const byId = new Map(config.panels.map((p) => [p.id, p]));
  const cells: Cell[] = [];
  let y = 0;

  for (let row = 0; row < config.rowCount; row += 1) {
    const step = config.rowPattern[row % config.rowPattern.length];
    if (!step) continue;
    const panel: Panel | undefined = byId.get(step.panelId);
    if (!panel) {
      // Missing panel — skip cells; metrics raises the warning.
      continue;
    }
    const order = applyRowTransform(expandStrips(panel.strips), step.transform);
    let x = 0;
    for (const s of order) {
      cells.push({
        xIn: x,
        yIn: y,
        wIn: s.widthIn,
        hIn: panel.thicknessIn,
        colorHex: colorFor(s.speciesId),
        speciesId: s.speciesId,
      });
      x += s.widthIn;
    }
    y += panel.thicknessIn;
  }

  return cells;
}
