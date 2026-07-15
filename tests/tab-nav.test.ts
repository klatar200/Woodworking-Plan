import { describe, it, expect } from 'vitest';
import { nextTabIndex } from '@/lib/tab-nav';

/**
 * Sprint 24 — the keyboard math behind the WAI-ARIA tab pattern in PlanTabs.
 *
 * This is the part with the real bug surface (off-by-one, broken wrap), and it's pure,
 * so it's tested directly. The React wiring (focus move, roving tabindex) is a thin shell
 * over this and is left to a manual/AT check, consistent with the app's no-jsdom stance.
 */
describe('nextTabIndex', () => {
  it('ArrowRight advances and wraps at the end', () => {
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0); // wrap
  });

  it('ArrowLeft retreats and wraps at the start', () => {
    expect(nextTabIndex('ArrowLeft', 2, 3)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2); // wrap
  });

  it('Home and End jump to the first and last tab', () => {
    expect(nextTabIndex('Home', 2, 3)).toBe(0);
    expect(nextTabIndex('End', 0, 3)).toBe(2);
  });

  it('returns null for a non-navigation key — the event is left alone', () => {
    expect(nextTabIndex('Enter', 1, 3)).toBeNull();
    expect(nextTabIndex('a', 1, 3)).toBeNull();
    expect(nextTabIndex('Tab', 1, 3)).toBeNull();
  });

  it('never returns an out-of-range index', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      for (let count = 1; count <= 4; count += 1) {
        for (let cur = 0; cur < count; cur += 1) {
          const n = nextTabIndex(key, cur, count);
          expect(n === null || (n >= 0 && n < count), `${key} @${cur}/${count}`).toBe(true);
        }
      }
    }
  });

  it('is a no-op guard when there are no tabs', () => {
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
