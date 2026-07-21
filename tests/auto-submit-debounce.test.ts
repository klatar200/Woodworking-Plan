import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTO_SUBMIT_DEBOUNCE_MS,
  createAutoSubmitOnChange,
} from '@/lib/use-soft-get-form';

/**
 * Sprint 39.2 (audit M2) — the filter panel's auto-apply debounce.
 *
 * The failure this guards against is invisible in a unit test of anything else: at the
 * old 200ms, ticking five tools fired FIVE catalog queries and five client navigations,
 * and the results list shifted under the reader between taps. The fix is one number, so
 * the test is about the number's CONSEQUENCE — a burst of changes must coalesce into
 * exactly one submit — not about the constant's value.
 *
 * `createAutoSubmitOnChange` exists so this is testable at all: the wiring used to live
 * only inside a `useEffect`, and this repo runs vitest in `node` with no DOM.
 */

function fakeForm() {
  const listeners: Array<(event: { target: unknown }) => void> = [];
  const submits: number[] = [];
  return {
    listeners,
    submits,
    addEventListener: (_t: 'change', fn: (event: { target: unknown }) => void) => {
      listeners.push(fn);
    },
    removeEventListener: (_t: 'change', fn: (event: { target: unknown }) => void) => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    },
    requestSubmit: () => void submits.push(Date.now()),
  };
}

/** A stand-in for a control, matching (or not) the delegated selector. */
const control = (matches: boolean) => ({ matches: () => matches });

const CHECKBOX = 'input[type=checkbox]';

describe('createAutoSubmitOnChange — a burst of ticks is ONE navigation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces three changes 200ms apart into a single submit', () => {
    const form = fakeForm();
    createAutoSubmitOnChange(form, CHECKBOX);

    for (let i = 0; i < 3; i++) {
      form.listeners.forEach((fn) => fn({ target: control(true) }));
      vi.advanceTimersByTime(200);
    }
    // 600ms of ticking has elapsed and nothing has been applied yet — this is the whole
    // point. At the old 200ms this had already fired three times.
    expect(form.submits).toHaveLength(0);

    vi.advanceTimersByTime(AUTO_SUBMIT_DEBOUNCE_MS);
    expect(form.submits).toHaveLength(1);
  });

  it('still applies after the LAST tick, so a single considered change feels live', () => {
    const form = fakeForm();
    createAutoSubmitOnChange(form, CHECKBOX);

    form.listeners.forEach((fn) => fn({ target: control(true) }));
    vi.advanceTimersByTime(AUTO_SUBMIT_DEBOUNCE_MS - 1);
    expect(form.submits).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(form.submits).toHaveLength(1);
  });

  /**
   * Trailing edge, deliberately. A leading edge would navigate on the first tick of a
   * burst — i.e. on the state the user is in the middle of leaving.
   */
  it('never fires on the leading edge', () => {
    const form = fakeForm();
    createAutoSubmitOnChange(form, CHECKBOX);
    form.listeners.forEach((fn) => fn({ target: control(true) }));
    expect(form.submits).toHaveLength(0);
  });

  /**
   * The selector gate is why the two filter `<select>`s can do their own pointer-vs-
   * keyboard gating: a keyboard arrow through the Category select must not navigate
   * mid-choice.
   */
  it('ignores changes from controls the selector does not match', () => {
    const form = fakeForm();
    createAutoSubmitOnChange(form, CHECKBOX);

    form.listeners.forEach((fn) => fn({ target: control(false) }));
    form.listeners.forEach((fn) => fn({ target: null }));
    vi.advanceTimersByTime(AUTO_SUBMIT_DEBOUNCE_MS * 2);
    expect(form.submits).toHaveLength(0);
  });

  /** A pending submit must not land after the form is gone (an unmount mid-burst). */
  it('cancels a pending submit on teardown and detaches its listener', () => {
    const form = fakeForm();
    const release = createAutoSubmitOnChange(form, CHECKBOX);

    form.listeners.forEach((fn) => fn({ target: control(true) }));
    release?.();
    vi.advanceTimersByTime(AUTO_SUBMIT_DEBOUNCE_MS * 2);

    expect(form.submits).toHaveLength(0);
    expect(form.listeners).toHaveLength(0);
  });

  /** No selector = no auto-apply: the same SoftGetForm still serves the sort form. */
  it('wires nothing when no selector is given', () => {
    const form = fakeForm();
    expect(createAutoSubmitOnChange(form)).toBeUndefined();
    expect(form.listeners).toHaveLength(0);
  });

  it('waits long enough to outlast a deliberate multi-select cadence', () => {
    // Guidance is a 300–600ms inter-tap median; the constant must sit past the slow end,
    // and stay short enough to feel like a control rather than a page load.
    expect(AUTO_SUBMIT_DEBOUNCE_MS).toBeGreaterThan(600);
    expect(AUTO_SUBMIT_DEBOUNCE_MS).toBeLessThanOrEqual(800);
  });
});
