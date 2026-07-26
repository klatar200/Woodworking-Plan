import type { Miter, MiterCorner, RowTransform } from './types';

/** Minimal cell shape for closure sampling — avoids a layout↔geometry cycle. */
export interface ClosableCell {
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
  speciesId: string;
  wedge?: {
    speciesId: string;
    polygon: ReadonlyArray<readonly [number, number]>;
  };
}

export type Point = readonly [number, number];

/**
 * Angle convention: `miter.angleDeg` is measured from the HORIZONTAL
 * (strip-width) axis. A table-saw "60° bevel" for the hexagon family is the
 * complement of θ = 30° here — the two get confused constantly.
 *
 * Vertical drop of the split across full tile width w: d = w · tan θ.
 *
 * `lineForCorner`: every corner wedge spans its full horizontal edge
 * (tl/tr cover the entire top; bl/br the entire bottom). Colour continuity
 * across a row boundary therefore requires wedges on both sides — bands are
 * always two rows deep. See Sprint 59 §A0.
 */

const CORNERS: readonly MiterCorner[] = ['tl', 'tr', 'bl', 'br'];

/**
 * Contrasting bands from corner miters are always two rows deep (a corner wedge
 * spans its full horizontal edge, so wedges must pair across a row boundary).
 * Base-species waist = 2t − 2d; setting it equal to the rhombus edge w/cosθ:
 *     t = w · sec θ
 * The one-row form t = w(tanθ + secθ) is unreachable with a single corner wedge
 * per strip — see Sprint 58's failed check 1.
 */
export function closingThicknessIn(widthIn: number, angleDeg: number): number {
  const theta = (angleDeg * Math.PI) / 180;
  return widthIn / Math.cos(theta);
}

/** True when |actual − ideal| / ideal > 5%. */
export function thicknessMismatchesClose(
  widthIn: number,
  thicknessIn: number,
  angleDeg: number,
  tolerance = 0.05,
): boolean {
  const ideal = closingThicknessIn(widthIn, angleDeg);
  if (!(ideal > 0) || !Number.isFinite(ideal)) return false;
  return Math.abs(thicknessIn - ideal) / ideal > tolerance;
}

export function mapMiterCorner(
  corner: MiterCorner,
  transform: RowTransform,
): MiterCorner {
  switch (transform) {
    case 'none':
      return corner;
    case 'rot180': {
      const map: Record<MiterCorner, MiterCorner> = {
        tl: 'br',
        tr: 'bl',
        bl: 'tr',
        br: 'tl',
      };
      return map[corner];
    }
    case 'mirrorX': {
      const map: Record<MiterCorner, MiterCorner> = {
        tl: 'tr',
        tr: 'tl',
        bl: 'br',
        br: 'bl',
      };
      return map[corner];
    }
    case 'mirrorY': {
      const map: Record<MiterCorner, MiterCorner> = {
        tl: 'bl',
        tr: 'br',
        bl: 'tl',
        br: 'tr',
      };
      return map[corner];
    }
  }
}

/**
 * Clip the axis-aligned cell rectangle by the miter half-plane.
 * Returns 3–5 vertices in absolute inches, clockwise, or null if degenerate.
 * Never throws; never emits vertices outside the cell (within float epsilon).
 */
export function clipMiterWedge(
  xIn: number,
  yIn: number,
  wIn: number,
  hIn: number,
  miter: Pick<Miter, 'angleDeg' | 'corner'>,
): Point[] | null {
  if (!(wIn > 0) || !(hIn > 0)) return null;
  const theta = (miter.angleDeg * Math.PI) / 180;
  if (!Number.isFinite(theta)) return null;
  const d = wIn * Math.tan(theta);
  if (!(d > 0) || !Number.isFinite(d)) return null;

  const rect: Point[] = [
    [xIn, yIn],
    [xIn + wIn, yIn],
    [xIn + wIn, yIn + hIn],
    [xIn, yIn + hIn],
  ];

  // Line through two points in local cell space, then absolute.
  // Half-plane keeps the named corner.
  const { a, b, keep } = lineForCorner(miter.corner, wIn, hIn, d);
  const A: Point = [xIn + a[0], yIn + a[1]];
  const B: Point = [xIn + b[0], yIn + b[1]];
  const keepPt: Point = [xIn + keep[0], yIn + keep[1]];

  const clipped = clipPolygonHalfPlane(rect, A, B, keepPt);
  if (clipped.length < 3) return null;

  const bounded = clipped.map(([x, y]) =>
    clampPoint(x, y, xIn, yIn, wIn, hIn),
  );
  const ordered = ensureClockwise(bounded);
  if (ordered.length < 3 || polygonArea(ordered) <= 1e-12) return null;
  return ordered;
}

function lineForCorner(
  corner: MiterCorner,
  w: number,
  h: number,
  d: number,
): { a: Point; b: Point; keep: Point } {
  switch (corner) {
    case 'tl':
      // Line (0,d)–(w,0); keep (0,0)
      return { a: [0, d], b: [w, 0], keep: [0, 0] };
    case 'tr':
      // Line (0,0)–(w,d); keep (w,0)
      return { a: [0, 0], b: [w, d], keep: [w, 0] };
    case 'bl':
      // Line (0,h-d)–(w,h); keep (0,h)
      return { a: [0, h - d], b: [w, h], keep: [0, h] };
    case 'br':
      // Line (0,h)–(w,h-d); keep (w,h)
      return { a: [0, h], b: [w, h - d], keep: [w, h] };
  }
}

function clampPoint(
  x: number,
  y: number,
  xIn: number,
  yIn: number,
  wIn: number,
  hIn: number,
): Point {
  const eps = 1e-9;
  return [
    Math.min(xIn + wIn + eps, Math.max(xIn - eps, x)),
    Math.min(yIn + hIn + eps, Math.max(yIn - eps, y)),
  ];
}

/** Signed cross (B−A) × (P−A). */
function cross(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/**
 * Sutherland–Hodgman clip of a convex polygon against the half-plane on the
 * keep-point side of directed line A→B.
 */
export function clipPolygonHalfPlane(
  polygon: readonly Point[],
  a: Point,
  b: Point,
  keep: Point,
): Point[] {
  if (polygon.length === 0) return [];
  const keepSign = Math.sign(cross(a[0], a[1], b[0], b[1], keep[0], keep[1]));
  // Degenerate keep on the line — treat both sides as outside; return empty.
  if (keepSign === 0) return [];

  const inside = (p: Point) =>
    Math.sign(cross(a[0], a[1], b[0], b[1], p[0], p[1])) === keepSign ||
    Math.abs(cross(a[0], a[1], b[0], b[1], p[0], p[1])) < 1e-12;

  const intersect = (p: Point, q: Point): Point => {
    const rX = q[0] - p[0];
    const rY = q[1] - p[1];
    const sX = b[0] - a[0];
    const sY = b[1] - a[1];
    const denom = rX * sY - rY * sX;
    if (Math.abs(denom) < 1e-14) return p;
    const t = ((a[0] - p[0]) * sY - (a[1] - p[1]) * sX) / denom;
    return [p[0] + t * rX, p[1] + t * rY];
  };

  const out: Point[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const cur = polygon[i]!;
    const prev = polygon[(i + polygon.length - 1) % polygon.length]!;
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return dedupePoints(out);
}

function dedupePoints(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 1e-9) continue;
    out.push(p);
  }
  if (
    out.length >= 2 &&
    Math.hypot(out[0]![0] - out[out.length - 1]![0], out[0]![1] - out[out.length - 1]![1]) <
      1e-9
  ) {
    out.pop();
  }
  return out;
}

export function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % points.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function ensureClockwise(points: Point[]): Point[] {
  // Positive shoelace = counter-clockwise in y-down? In math y-up CCW is positive.
  // Our y increases downward (SVG). For "clockwise" in screen space (= math CCW):
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % points.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  // Screen-clockwise ⇒ negative shoelace in y-down coords equals positive in y-up.
  // Require screen-clockwise: sum > 0 in y-down means left-hand (CCW on screen).
  if (sum > 0) return points.slice().reverse();
  return points;
}

/** Area fraction of the wedge within the strip cross-section w×t. */
export function miterWedgeFraction(
  widthIn: number,
  thicknessIn: number,
  miter: Pick<Miter, 'angleDeg' | 'corner'>,
): number {
  const poly = clipMiterWedge(0, 0, widthIn, thicknessIn, miter);
  if (!poly) return 0;
  const cellArea = widthIn * thicknessIn;
  if (!(cellArea > 0)) return 0;
  return Math.min(1, Math.max(0, polygonArea(poly) / cellArea));
}

export function pointInPolygon(x: number, y: number, polygon: readonly Point[]): boolean {
  // Ray cast; boundary counts as inside.
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]![0];
    const yi = polygon[i]![1];
    const xj = polygon[j]![0];
    const yj = polygon[j]![1];
    const onEdge =
      Math.abs(cross(xj, yj, xi, yi, x, y)) < 1e-9 &&
      x >= Math.min(xj, xi) - 1e-9 &&
      x <= Math.max(xj, xi) + 1e-9 &&
      y >= Math.min(yj, yi) - 1e-9 &&
      y <= Math.max(yj, yi) + 1e-9;
    if (onEdge) return true;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Colour (speciesId) at a point inside a cell. */
export function colorAtCell(cell: ClosableCell, x: number, y: number): string {
  if (
    cell.wedge &&
    pointInPolygon(x, y, cell.wedge.polygon)
  ) {
    return cell.wedge.speciesId;
  }
  return cell.speciesId;
}

/**
 * Full lattice-closure check for mitered boards:
 * 1) colour continuous across every shared cell edge (sampled), and
 * 2) every mitered strip's panel thickness within 5% of t = w·secθ.
 *
 * Colour continuity is necessary but not sufficient for a named lattice —
 * use `speciesComponents` to assert shape. Thickness gate stops the
 * one-row-form warning from being backwards on the two-row harlequin.
 */
export function miterLatticeCloses(
  cells: readonly ClosableCell[],
  panels: readonly { thicknessIn: number; strips: readonly { widthIn: number; miter?: Miter }[] }[],
  samplesPerEdge = 24,
): boolean {
  for (const panel of panels) {
    for (const strip of panel.strips) {
      if (!strip.miter) continue;
      if (
        thicknessMismatchesClose(
          strip.widthIn,
          panel.thicknessIn,
          strip.miter.angleDeg,
        )
      ) {
        return false;
      }
    }
  }
  return cellsColorClosed(cells, samplesPerEdge);
}

/**
 * Colour continuity only — every shared edge agrees species at every sample.
 * Compares only spatially adjacent cells (same-row neighbours + next-row
 * neighbours), not the O(n²) all-pairs scan.
 */
export function cellsColorClosed(
  cells: readonly ClosableCell[],
  samplesPerEdge = 24,
): boolean {
  if (cells.length === 0) return true;
  const eps = 1e-7;

  // Group by row (yIn) so we only compare neighbours.
  const byRow = new Map<number, ClosableCell[]>();
  for (const cell of cells) {
    const key = Math.round(cell.yIn * 1e6) / 1e6;
    const list = byRow.get(key);
    if (list) list.push(cell);
    else byRow.set(key, [cell]);
  }
  const rowKeys = [...byRow.keys()].sort((a, b) => a - b);

  for (const key of rowKeys) {
    const row = byRow.get(key)!;
    row.sort((a, b) => a.xIn - b.xIn);
    for (let i = 0; i < row.length - 1; i += 1) {
      const a = row[i]!;
      const b = row[i + 1]!;
      if (!edgesTouchVertical(a, b, eps)) continue;
      const x = nearEqual(a.xIn + a.wIn, b.xIn, eps)
        ? a.xIn + a.wIn
        : nearEqual(b.xIn + b.wIn, a.xIn, eps)
          ? b.xIn + b.wIn
          : null;
      if (x === null) continue;
      const y0 = Math.max(a.yIn, b.yIn);
      const y1 = Math.min(a.yIn + a.hIn, b.yIn + b.hIn);
      if (y1 - y0 > eps && !edgeColorsMatch(a, b, 'v', x, y0, y1, samplesPerEdge)) {
        return false;
      }
    }
  }

  for (let r = 0; r < rowKeys.length - 1; r += 1) {
    const upper = byRow.get(rowKeys[r]!)!;
    const lower = byRow.get(rowKeys[r + 1]!)!;
    // Two-pointer over x-sorted rows — only overlapping x-ranges (O(n) per row pair).
    let j = 0;
    for (const a of upper) {
      while (j < lower.length && lower[j]!.xIn + lower[j]!.wIn <= a.xIn + eps) {
        j += 1;
      }
      for (let k = j; k < lower.length; k += 1) {
        const b = lower[k]!;
        if (b.xIn >= a.xIn + a.wIn - eps) break;
        if (!edgesTouchHorizontal(a, b, eps)) continue;
        const y = nearEqual(a.yIn + a.hIn, b.yIn, eps)
          ? a.yIn + a.hIn
          : nearEqual(b.yIn + b.hIn, a.yIn, eps)
            ? b.yIn + b.hIn
            : null;
        if (y === null) continue;
        const x0 = Math.max(a.xIn, b.xIn);
        const x1 = Math.min(a.xIn + a.wIn, b.xIn + b.wIn);
        if (x1 - x0 > eps && !edgeColorsMatch(a, b, 'h', y, x0, x1, samplesPerEdge)) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Rasterize the top face and connected-component-label it per species.
 * Returns component counts and areas (in square inches). This is the only
 * honest way to ask "what shape is this?" — edge sampling cannot distinguish
 * a lattice of closed cells from one connected field with wavy edges.
 */
export function speciesComponents(
  cells: readonly ClosableCell[],
  samplesPerInch = 16,
): Map<string, { count: number; areas: number[] }> {
  const empty = new Map<string, { count: number; areas: number[] }>();
  if (cells.length === 0 || !(samplesPerInch > 0)) return empty;

  let maxX = 0;
  let maxY = 0;
  for (const c of cells) {
    maxX = Math.max(maxX, c.xIn + c.wIn);
    maxY = Math.max(maxY, c.yIn + c.hIn);
  }
  if (!(maxX > 0) || !(maxY > 0)) return empty;

  // Cap total samples ~400k.
  let spi = samplesPerInch;
  const rough = maxX * spi * maxY * spi;
  if (rough > 400_000) {
    spi = Math.sqrt(400_000 / (maxX * maxY));
  }
  const cols = Math.max(1, Math.ceil(maxX * spi));
  const rows = Math.max(1, Math.ceil(maxY * spi));
  const dx = maxX / cols;
  const dy = maxY / rows;
  const sampleArea = dx * dy;

  // Cell lookup acceleration: bucket by integer row of cell.yIn
  const grid: (string | null)[] = new Array(cols * rows).fill(null);
  for (let ry = 0; ry < rows; ry += 1) {
    const y = (ry + 0.5) * dy;
    for (let cx = 0; cx < cols; cx += 1) {
      const x = (cx + 0.5) * dx;
      const cell = findCellAt(cells, x, y);
      if (!cell) continue;
      grid[ry * cols + cx] = colorAtCell(cell, x, y);
    }
  }

  const seen = new Uint8Array(cols * rows);
  const result = new Map<string, { count: number; areas: number[] }>();

  for (let i = 0; i < grid.length; i += 1) {
    const species = grid[i];
    if (!species || seen[i]) continue;
    // Flood fill
    let areaSamples = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const idx = stack.pop()!;
      areaSamples += 1;
      const x = idx % cols;
      const y = (idx - x) / cols;
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x + 1 < cols ? idx + 1 : -1,
        y > 0 ? idx - cols : -1,
        y + 1 < rows ? idx + cols : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || seen[n]) continue;
        if (grid[n] !== species) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    const entry = result.get(species) ?? { count: 0, areas: [] };
    entry.count += 1;
    entry.areas.push(areaSamples * sampleArea);
    result.set(species, entry);
  }
  return result;
}

function findCellAt(
  cells: readonly ClosableCell[],
  x: number,
  y: number,
): ClosableCell | undefined {
  for (const c of cells) {
    if (
      x >= c.xIn &&
      x < c.xIn + c.wIn &&
      y >= c.yIn &&
      y < c.yIn + c.hIn
    ) {
      return c;
    }
  }
  return undefined;
}

function nearEqual(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) <= eps;
}

function edgesTouchVertical(a: ClosableCell, b: ClosableCell, eps: number): boolean {
  const yOverlap =
    Math.min(a.yIn + a.hIn, b.yIn + b.hIn) - Math.max(a.yIn, b.yIn) > eps;
  if (!yOverlap) return false;
  return (
    nearEqual(a.xIn + a.wIn, b.xIn, eps) || nearEqual(b.xIn + b.wIn, a.xIn, eps)
  );
}

function edgesTouchHorizontal(a: ClosableCell, b: ClosableCell, eps: number): boolean {
  const xOverlap =
    Math.min(a.xIn + a.wIn, b.xIn + b.wIn) - Math.max(a.xIn, b.xIn) > eps;
  if (!xOverlap) return false;
  return (
    nearEqual(a.yIn + a.hIn, b.yIn, eps) || nearEqual(b.yIn + b.hIn, a.yIn, eps)
  );
}

function edgeColorsMatch(
  a: ClosableCell,
  b: ClosableCell,
  axis: 'v' | 'h',
  fixed: number,
  from: number,
  to: number,
  samples: number,
): boolean {
  const inset = (to - from) * 1e-4;
  for (let s = 0; s <= samples; s += 1) {
    const t = from + inset + ((to - from - 2 * inset) * s) / samples;
    let ax: number;
    let ay: number;
    let bx: number;
    let by: number;
    if (axis === 'v') {
      // Sample just inside each cell
      ax = fixed - 1e-6;
      if (ax < a.xIn) ax = fixed + 1e-6;
      if (ax > a.xIn + a.wIn) ax = a.xIn + a.wIn / 2;
      // Determine which cell is on the left of the edge
      const aLeft = a.xIn + a.wIn <= b.xIn + 1e-6;
      ax = aLeft ? fixed - 1e-6 : fixed + 1e-6;
      bx = aLeft ? fixed + 1e-6 : fixed - 1e-6;
      ay = t;
      by = t;
    } else {
      const aAbove = a.yIn + a.hIn <= b.yIn + 1e-6;
      ay = aAbove ? fixed - 1e-6 : fixed + 1e-6;
      by = aAbove ? fixed + 1e-6 : fixed - 1e-6;
      ax = t;
      bx = t;
    }
    if (colorAtCell(a, ax, ay) !== colorAtCell(b, bx, by)) return false;
  }
  return true;
}

export { CORNERS };
