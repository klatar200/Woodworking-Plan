import { describe, it, expect, afterEach } from 'vitest';
import {
  clampStep,
  clearStoredStep,
  readStoredStep,
  shouldScroll,
  stepStorageKey,
  stepToPersist,
  writeStoredStep,
} from '@/lib/step-progress';

/**
 * Sprint 38 (audit H3/M3) — the step walker's memory and scroll rules.
 *
 * Everything in step-progress.ts exists so that the parts of 38.1/38.2 that can be WRONG
 * are separable from the parts that need a browser. The component still owns the DOM; the
 * arithmetic is here, and it is the arithmetic that decides whether a builder is dumped
 * on the wrong step or has the page yanked out from under them.
 */

describe('clampStep — stored input is stale input', () => {
  it('accepts a valid step', () => {
    expect(clampStep('7', 14)).toBe(7);
    expect(clampStep('1', 14)).toBe(1);
    expect(clampStep('14', 14)).toBe(14);
  });

  it('falls back to step 1 for anything that is not a plain integer string', () => {
    for (const raw of [null, undefined, '', ' ', 'abc', '2.5', '-3', '+3', ' 3', '3 ', 0, 3]) {
      expect(clampStep(raw, 14), String(raw)).toBe(1);
    }
  });

  /**
   * The `form-fields.ts` lesson, restated: `Number.parseInt` reads "9abc" as 9 and "1e9"
   * as 1 — it invents a plausible answer out of garbage rather than rejecting it. Both of
   * these would silently "work" under parseInt.
   */
  it('does not let parseInt-style coercion invent a step', () => {
    expect(clampStep('9abc', 14)).toBe(1);
    expect(clampStep('1e9', 14)).toBe(1);
  });

  /**
   * A plan can LOSE steps between visits (content edits do not ask permission). The last
   * step is a better guess at where you were than the first one.
   */
  it('clamps a step that outlived the plan down to the last step', () => {
    expect(clampStep('9', 4)).toBe(4);
    expect(clampStep('99999999999999999999', 4)).toBe(4);
  });

  it('never returns something un-renderable when the total itself is nonsense', () => {
    expect(clampStep('3', 0)).toBe(1);
    expect(clampStep('3', -1)).toBe(1);
    expect(clampStep('3', 2.5)).toBe(1);
  });
});

describe('stepToPersist — finishing forgets', () => {
  it('remembers every step before the last', () => {
    expect(stepToPersist(1, 14)).toBe(1);
    expect(stepToPersist(13, 14)).toBe(13);
  });

  /** Reaching the last step is the finish state; a rebuild should start at step 1. */
  it('returns null on the last step so the key is cleared', () => {
    expect(stepToPersist(14, 14)).toBeNull();
  });

  it('stores nothing for a plan with no walker (one step or fewer)', () => {
    expect(stepToPersist(1, 1)).toBeNull();
    expect(stepToPersist(1, 0)).toBeNull();
  });
});

describe('shouldScroll — move the viewport only when the reader cannot see the step', () => {
  /** The audit's case: deep inside a long step, so the walker's top is off-screen above. */
  it('scrolls when the walker has scrolled off the top', () => {
    expect(shouldScroll(-1200, 800)).toBe(true);
    expect(shouldScroll(-1, 800)).toBe(true);
  });

  /** The desktop rail: the whole walker is on screen, so a scroll would just be a yank. */
  it('does nothing when the walker top is already in view', () => {
    expect(shouldScroll(0, 800)).toBe(false);
    expect(shouldScroll(120, 800)).toBe(false);
    expect(shouldScroll(800, 800)).toBe(false);
  });

  it('scrolls when the walker is entirely below the fold', () => {
    expect(shouldScroll(801, 800)).toBe(true);
  });
});

describe('the storage key', () => {
  it('is namespaced per plan', () => {
    expect(stepStorageKey('cedar-raised-garden-bed')).toBe('step:cedar-raised-garden-bed');
  });
});

/**
 * THE ENHANCEMENT MUST NOT BECOME A DEPENDENCY. localStorage throws outright in Safari
 * private mode and with cookies blocked — including on plain reads. A walker that dies
 * because it could not remember your place has traded the feature for the nice-to-have.
 */
describe('storage access survives a browser that refuses storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  function useStorage(impl: Partial<Storage>) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: impl,
      configurable: true,
      writable: true,
    });
  }

  it('reads a stored step back through the clamp', () => {
    useStorage({ getItem: (key: string) => (key === 'step:desk' ? '5' : null) });
    expect(readStoredStep('desk', 14)).toBe(5);
    expect(readStoredStep('other', 14)).toBe(1);
  });

  it('returns step 1 instead of throwing when reading throws', () => {
    useStorage({
      getItem: () => {
        throw new Error('The operation is insecure.');
      },
    });
    expect(() => readStoredStep('desk', 14)).not.toThrow();
    expect(readStoredStep('desk', 14)).toBe(1);
  });

  it('swallows a write that throws (quota exceeded, private mode)', () => {
    useStorage({
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => writeStoredStep('desk', 3)).not.toThrow();
    expect(() => clearStoredStep('desk')).not.toThrow();
  });

  /** No global at all — a non-browser render, or a hardened profile. */
  it('survives localStorage not existing', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(readStoredStep('desk', 14)).toBe(1);
    expect(() => writeStoredStep('desk', 3)).not.toThrow();
    expect(() => clearStoredStep('desk')).not.toThrow();
  });

  it('writes the step as a plain integer string under the namespaced key', () => {
    const written: Array<[string, string]> = [];
    useStorage({ setItem: (k: string, v: string) => void written.push([k, v]) });
    writeStoredStep('desk', 7);
    expect(written).toEqual([['step:desk', '7']]);
  });
});
