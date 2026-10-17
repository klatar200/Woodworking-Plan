import { calculateMetrics } from '@/lib/board-designer/metrics';
import { layoutTopFace, type Cell } from '@/lib/board-designer/layout';
import { inWedge } from '@/lib/board-designer/miter-geometry';
import { parseConfig } from '@/lib/board-designer/serialize';
import { UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

/**
 * `/designer/library` thumbnails (Sprint 65; Sprint 82).
 *
 * Up to MAX_THUMB_CELLS the thumbnail draws every cell exactly. Above it the board is downsampled
 * to at most THUMB_GRID × THUMB_GRID rects: each grid square averages a few colour samples, and
 * equal neighbours merge. The library draws N designs at once, so the per-tile budget stays far
 * under the editor's 5_000 (`MAX_DRAWN_CELLS`). The picture always covers the WHOLE board — never
 * a partial one, because a wrong picture is worse than none. It used to fall back to "Too many
 * pieces to preview", which hid most real end-grain designs.
 */
export const MAX_THUMB_CELLS = 500;
export const THUMB_GRID = 32;
export const THUMB_SUPERSAMPLE = 3;

export type ThumbModel =
  | {
      kind: 'ok';
      cells: Cell[];
      widthIn: number;
      heightIn: number;
      /** True when the cells are a downsample, not the design's own cells. */
      approximate: boolean;
    }
  | { kind: 'placeholder'; reason: 'invalid' | 'empty' };

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
    const widthIn = positiveOrOne(metrics.finishedLengthIn);
    const heightIn = positiveOrOne(metrics.finishedWidthIn);
    if (cells.length <= MAX_THUMB_CELLS) {
      return { kind: 'ok', cells, widthIn, heightIn, approximate: false };
    }
    return {
      kind: 'ok',
      cells: downsample(cells, widthIn, heightIn),
      widthIn,
      heightIn,
      approximate: true,
    };
  } catch {
    // calculateMetrics / layoutTopFace are pure and should not throw; belt+suspenders.
    return { kind: 'placeholder', reason: 'invalid' };
  }
}

function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function placeholderLabel(reason: 'invalid' | 'empty'): string {
  switch (reason) {
    case 'invalid':
      return 'Could not read this board';
    case 'empty':
      return 'No strips to preview';
  }
}

type Band = { yIn: number; hIn: number; cells: Cell[] };

/** Group cells into horizontal bands (layout rows), each sorted by x — for binary search. */
function bandsOf(cells: Cell[]): Band[] {
  const byRow = new Map<string, Band>();
  for (const cell of cells) {
    const key = `${cell.yIn}\0${cell.hIn}`;
    const band = byRow.get(key);
    if (band) band.cells.push(cell);
    else byRow.set(key, { yIn: cell.yIn, hIn: cell.hIn, cells: [cell] });
  }
  const bands = [...byRow.values()].sort((a, b) => a.yIn - b.yIn);
  for (const band of bands) band.cells.sort((a, b) => a.xIn - b.xIn);
  return bands;
}

/** Last element whose start is ≤ value, or -1. */
function lastAtOrBefore<T>(items: T[], value: number, startOf: (item: T) => number): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (startOf(items[mid]!) <= value) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

function colourAt(bands: Band[], x: number, y: number): string {
  const b = lastAtOrBefore(bands, y, (band) => band.yIn);
  const band = b >= 0 ? bands[b]! : null;
  if (!band || y > band.yIn + band.hIn) return UNKNOWN_SPECIES_COLOR;
  const c = lastAtOrBefore(band.cells, x, (cell) => cell.xIn);
  const cell = c >= 0 ? band.cells[c]! : null;
  if (!cell || x > cell.xIn + cell.wIn) return UNKNOWN_SPECIES_COLOR;
  return cell.wedge && inWedge(cell, x, y) ? cell.wedge.colorHex : cell.colorHex;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const part = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/**
 * Whole-board downsample: THUMB_GRID squares along the longer side, each the average of
 * THUMB_SUPERSAMPLE² samples, equal neighbours in a row merged into one rect.
 */
function downsample(cells: Cell[], widthIn: number, heightIn: number): Cell[] {
  const bands = bandsOf(cells);
  const longer = Math.max(widthIn, heightIn);
  const cols = widthIn >= heightIn ? THUMB_GRID : Math.max(1, Math.round((THUMB_GRID * widthIn) / longer));
  const rows = heightIn > widthIn ? THUMB_GRID : Math.max(1, Math.round((THUMB_GRID * heightIn) / longer));
  const sw = widthIn / cols;
  const sh = heightIn / rows;
  const n = THUMB_SUPERSAMPLE;
  const out: Cell[] = [];

  for (let row = 0; row < rows; row += 1) {
    let runStart = 0;
    let runHex = '';
    const flush = (endCol: number) => {
      if (endCol <= runStart) return;
      out.push({
        xIn: runStart * sw,
        yIn: row * sh,
        wIn: (endCol - runStart) * sw,
        hIn: sh,
        colorHex: runHex,
        speciesId: '',
      });
    };
    for (let col = 0; col < cols; col += 1) {
      const sum: [number, number, number] = [0, 0, 0];
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const x = (col + (i + 0.5) / n) * sw;
          const y = (row + (j + 0.5) / n) * sh;
          const [r, g, b] = hexToRgb(colourAt(bands, x, y));
          sum[0] += r;
          sum[1] += g;
          sum[2] += b;
        }
      }
      const hex = rgbToHex([sum[0] / (n * n), sum[1] / (n * n), sum[2] / (n * n)]);
      if (col === 0) {
        runHex = hex;
      } else if (hex !== runHex) {
        flush(col);
        runStart = col;
        runHex = hex;
      }
    }
    flush(cols);
  }
  return out;
}
