import { getSpecies, UNKNOWN_SPECIES_COLOR } from './species';
import {
  clipMiterWedge,
  mapMiterCorner,
} from './miter-geometry';
import type {
  BoardDesignConfig,
  BoardMetrics,
  CellWedge,
  Miter,
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
  /** Present only for a mitered strip. Absolute inches, same space as x/y/w/h. */
  wedge?: CellWedge;
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

function transformStrip(strip: Strip, transform: RowTransform): Strip {
  if (!strip.miter) {
    return strip;
  }
  const miter: Miter = {
    ...strip.miter,
    corner: mapMiterCorner(strip.miter.corner, transform),
  };
  return { ...strip, miter };
}

/**
 * Apply a row transform to an expanded strip list.
 * rot180 / mirrorX reverse order; none / mirrorY keep order.
 * Miter corners transform with the row (§A2) so lattices can close.
 */
export function applyRowTransform(strips: Strip[], transform: RowTransform): Strip[] {
  const mapped = strips.map((s) => transformStrip(s, transform));
  if (transform === 'rot180' || transform === 'mirrorX') {
    return mapped.reverse();
  }
  return mapped;
}

function cellForStrip(
  strip: Strip,
  xIn: number,
  yIn: number,
  wIn: number,
  hIn: number,
): Cell {
  const cell: Cell = {
    xIn,
    yIn,
    wIn,
    hIn,
    colorHex: colorFor(strip.speciesId),
    speciesId: strip.speciesId,
  };
  if (!strip.miter) return cell;

  const polygon = clipMiterWedge(xIn, yIn, wIn, hIn, strip.miter);
  if (!polygon) return cell;

  cell.wedge = {
    speciesId: strip.miter.speciesId,
    colorHex: colorFor(strip.miter.speciesId),
    polygon,
    angleDeg: strip.miter.angleDeg,
    corner: strip.miter.corner,
  };
  return cell;
}

/**
 * Top-face cell layout for SVG + 3D. Origin top-left; x along finishedLengthIn,
 * y along finishedWidthIn. Pure and deterministic.
 *
 * edge: panels[0] strips stacked down y; row height = strip width.
 * end:  rowPattern cycled to rowCount; y accumulates per-row panel thickness.
 * Solid strips emit no wedge and stay byte-identical to pre-miter output.
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
      cells.push(
        cellForStrip(s, 0, y, metrics.finishedLengthIn, s.widthIn),
      );
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
      cells.push(cellForStrip(s, x, y, s.widthIn, panel.thicknessIn));
      x += s.widthIn;
    }
    y += panel.thicknessIn;
  }

  return cells;
}
