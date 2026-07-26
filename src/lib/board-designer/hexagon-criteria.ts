import {
  colorAtCell,
  speciesComponents,
  type ClosableCell,
} from './miter-geometry';

export interface HexagonLatticeResult {
  ok: boolean;
  contrastComponents: number;
  baseComponents: number;
  interiorHullVertices: number[];
  reason?: string;
}

/**
 * Acceptance criteria for a closed hexagonal lattice (Sprint 59 §B2):
 * - contrasting species → 1 connected component (the web)
 * - base species → ≥ 6 disjoint components (the cells), interior areas equal within 5%
 * - each interior cell's convex hull has 6 vertices within an angular tolerance
 *
 * Harlequin must fail this. Sprint 59 Part B found one-miter 60° webs that
 * satisfy connectivity but produce 4/8-gons — never 6-vertex hex cells.
 */
export function evaluateHexagonLattice(
  cells: readonly ClosableCell[],
  baseSpeciesId: string,
  contrastSpeciesId: string,
  samplesPerInch = 36,
): HexagonLatticeResult {
  const comps = speciesComponents(cells, samplesPerInch);
  const contrast = comps.get(contrastSpeciesId);
  const base = comps.get(baseSpeciesId);
  const contrastComponents = contrast?.count ?? 0;
  const baseComponents = base?.count ?? 0;

  if (contrastComponents !== 1) {
    return {
      ok: false,
      contrastComponents,
      baseComponents,
      interiorHullVertices: [],
      reason: 'contrast species is not a single connected web',
    };
  }
  if (baseComponents < 6) {
    return {
      ok: false,
      contrastComponents,
      baseComponents,
      interiorHullVertices: [],
      reason: 'base species has fewer than 6 cells',
    };
  }

  const sorted = [...(base?.areas ?? [])].sort((a, b) => a - b);
  const start = Math.floor(sorted.length * 0.25);
  const interiorAreas = sorted.slice(start);
  const mean =
    interiorAreas.reduce((s, v) => s + v, 0) / Math.max(1, interiorAreas.length);
  for (const a of interiorAreas) {
    if (mean > 0 && Math.abs(a - mean) / mean > 0.05) {
      return {
        ok: false,
        contrastComponents,
        baseComponents,
        interiorHullVertices: [],
        reason: 'interior base cell areas differ by more than 5%',
      };
    }
  }

  const hulls = baseCellHullVertexCounts(
    cells,
    baseSpeciesId,
    samplesPerInch,
    22,
  );
  // Drop the smallest hulls (edge fragments) — same quartile as areas.
  const hullSorted = [...hulls].sort((a, b) => a - b);
  const interiorHullVertices = hullSorted.slice(
    Math.floor(hullSorted.length * 0.25),
  );
  const allSix = interiorHullVertices.every((v) => v === 6);
  return {
    ok: allSix && interiorHullVertices.length >= 6,
    contrastComponents,
    baseComponents,
    interiorHullVertices,
    reason: allSix ? undefined : 'interior cells are not 6-vertex hexagons',
  };
}

function baseCellHullVertexCounts(
  cells: readonly ClosableCell[],
  speciesId: string,
  spi: number,
  angleTolDeg: number,
): number[] {
  let maxX = 0;
  let maxY = 0;
  for (const c of cells) {
    maxX = Math.max(maxX, c.xIn + c.wIn);
    maxY = Math.max(maxY, c.yIn + c.hIn);
  }
  if (!(maxX > 0) || !(maxY > 0)) return [];

  const cols = Math.max(1, Math.ceil(maxX * spi));
  const rows = Math.max(1, Math.ceil(maxY * spi));
  const dx = maxX / cols;
  const dy = maxY / rows;
  const grid: (string | null)[] = new Array(cols * rows).fill(null);

  for (let ry = 0; ry < rows; ry += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      const x = (cx + 0.5) * dx;
      const y = (ry + 0.5) * dy;
      const cell = cells.find(
        (c) =>
          x >= c.xIn &&
          x < c.xIn + c.wIn &&
          y >= c.yIn &&
          y < c.yIn + c.hIn,
      );
      if (cell) grid[ry * cols + cx] = colorAtCell(cell, x, y);
    }
  }

  const seen = new Uint8Array(cols * rows);
  const counts: number[] = [];
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] !== speciesId || seen[i]) continue;
    const pts: [number, number][] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % cols;
      const y = (idx - x) / cols;
      pts.push([(x + 0.5) * dx, (y + 0.5) * dy]);
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x + 1 < cols ? idx + 1 : -1,
        y > 0 ? idx - cols : -1,
        y + 1 < rows ? idx + cols : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || seen[n] || grid[n] !== speciesId) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    counts.push(simplifyHull(convexHull(pts), angleTolDeg).length);
  }
  return counts;
}

function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points.slice();
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number],
  ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i]!;
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function simplifyHull(
  hull: [number, number][],
  angleTolDeg: number,
): [number, number][] {
  if (hull.length <= 3) return hull;
  const tol = (angleTolDeg * Math.PI) / 180;
  const out: [number, number][] = [];
  const n = hull.length;
  for (let i = 0; i < n; i += 1) {
    const prev = hull[(i + n - 1) % n]!;
    const cur = hull[i]!;
    const next = hull[(i + 1) % n]!;
    const ax = cur[0] - prev[0];
    const ay = cur[1] - prev[1];
    const bx = next[0] - cur[0];
    const by = next[1] - cur[1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 1e-12 || lb < 1e-12) continue;
    const dot = (ax * bx + ay * by) / (la * lb);
    const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (Math.abs(ang) > tol) out.push(cur);
  }
  return out.length >= 3 ? out : hull;
}
