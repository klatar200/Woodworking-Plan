/**
 * Keyboard navigation math for the WAI-ARIA tab pattern — Sprint 24 (hardening).
 *
 * Pure and separate from the React component so the one part most likely to hold an
 * off-by-one or a broken wrap-around — the arrow/Home/End index math — is unit-tested
 * in plain Node, without needing a DOM. `PlanTabs` calls this from its `keydown` handler.
 */

/**
 * Given a key, the current tab index, and the number of tabs, returns the index the
 * focus should move to — or `null` for a key that isn't a navigation key (leave the
 * event alone). Left/Right wrap around the ends; Home/End jump to first/last.
 */
export function nextTabIndex(
  key: string,
  current: number,
  count: number,
): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
