/**
 * Pick the strip drop index from a pointer Y, given laid-out item rects.
 * Pure — extracted so pointer-drag tests don't depend on jsdom layout.
 */
export function dropIndexFromClientY(
  clientY: number,
  rects: ReadonlyArray<{ top: number; height: number }>,
  fallback: number,
): number {
  if (rects.length === 0) return fallback;
  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i]!;
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return Math.max(0, rects.length - 1);
}
