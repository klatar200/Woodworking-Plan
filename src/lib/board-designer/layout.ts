import { getSpecies, UNKNOWN_SPECIES_COLOR } from './species';
import type { BoardDesignConfig, BoardMetrics, Strip } from './types';

export interface Cell {
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
  colorHex: string;
  speciesId: string;
}

/** Expand strip.repeat into one entry per physical strip (left → right / top → bottom). */
function expandStrips(strips: Strip[]): Strip[] {
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
 * Top-face cell layout for SVG + 3D. Origin top-left; x along finishedLengthIn,
 * y along finishedWidthIn. Pure and deterministic.
 *
 * edge: one cell per strip-repeat, stacked down y.
 * end:  columns = strips, rows = slices; odd rows rotate strip order by one when flipping.
 */
export function layoutTopFace(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): Cell[] {
  const expanded = expandStrips(config.strips);

  if (config.grain === 'edge') {
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

  // end grain: grid — columns = strips, rows = slices
  const rows = metrics.sliceCount;
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    const order =
      config.flipEveryOtherSlice && row % 2 === 1
        ? rotateByOne(expanded)
        : expanded;
    let x = 0;
    const y = row * config.stockThicknessIn;
    for (const s of order) {
      cells.push({
        xIn: x,
        yIn: y,
        wIn: s.widthIn,
        hIn: config.stockThicknessIn,
        colorHex: colorFor(s.speciesId),
        speciesId: s.speciesId,
      });
      x += s.widthIn;
    }
  }
  return cells;
}

/** Rotate left by one: [A,B,C] → [B,C,A]. Produces the checkerboard on odd rows. */
function rotateByOne<T>(items: T[]): T[] {
  if (items.length <= 1) return items.slice();
  return [...items.slice(1), items[0]!];
}
