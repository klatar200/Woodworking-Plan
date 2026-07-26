import { stripDisplayName } from '@/lib/board-designer/strip-display';
import type { Strip } from '@/lib/board-designer/types';

export type StripMove = { id: string; fromIndex: number; toIndex: number };

/**
 * Detect a single-strip reorder (splice from→to), including one-step `move-strip`
 * and multi-step `reorder-strip` / undo of either. Returns null for no-ops,
 * length changes, and non-reorder edits.
 *
 * When multiple splices explain an adjacent swap, prefers max travel then lower
 * `fromIndex` (stable). User-driven arrows/drag should announce at the call site
 * with the acted-upon strip; this helper covers undo/redo observation.
 */
export function findPrimaryStripMove(
  prevIds: readonly string[],
  nextIds: readonly string[],
): StripMove | null {
  if (prevIds.length !== nextIds.length || prevIds.length === 0) return null;
  if (prevIds.every((id, i) => id === nextIds[i])) return null;

  const sortedPrev = [...prevIds].sort().join('\0');
  const sortedNext = [...nextIds].sort().join('\0');
  if (sortedPrev !== sortedNext) return null;

  const candidates: StripMove[] = [];
  for (let from = 0; from < prevIds.length; from += 1) {
    const id = prevIds[from]!;
    const to = nextIds.indexOf(id);
    if (to === from) continue;
    const simulated = prevIds.slice();
    simulated.splice(from, 1);
    simulated.splice(to, 0, id);
    if (simulated.every((x, i) => x === nextIds[i])) {
      candidates.push({ id, fromIndex: from, toIndex: to });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      Math.abs(b.fromIndex - b.toIndex) - Math.abs(a.fromIndex - a.toIndex) ||
      a.fromIndex - b.fromIndex,
  );
  return candidates[0]!;
}

export function stripReorderAnnouncement(
  strip: Strip,
  displayIndex: number,
  toIndex: number,
  total: number,
): string {
  const name = stripDisplayName(strip, displayIndex);
  return `${name} moved to position ${toIndex + 1} of ${total}`;
}

/** Live-region copy from a before/after id list. Null when nothing to announce. */
export function formatStripReorderAnnouncement(
  prevIds: readonly string[],
  nextStrips: readonly Strip[],
): string | null {
  const nextIds = nextStrips.map((s) => s.id);
  const move = findPrimaryStripMove(prevIds, nextIds);
  if (!move) return null;
  const strip = nextStrips.find((s) => s.id === move.id);
  if (!strip) return null;
  return stripReorderAnnouncement(strip, move.fromIndex, move.toIndex, nextStrips.length);
}
