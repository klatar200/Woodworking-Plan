'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Soft-navigation for a GET `<form>` — QOL-H.
 *
 * This codebase deliberately drives browse/search/sort/filter state through plain
 * GET forms (see `search-box.tsx`, `sort-select.tsx`): the state lands in the URL, so
 * a view is shareable and every control still works with JavaScript off. The cost is
 * that submitting one is a NATIVE navigation — a fresh document GET, the whole
 * page (header, footer, everything) re-fetched and repainted, with a white flash and
 * the scroll thrown back to the top. QOL-A removed the extra Apply click on the sort
 * control; it did not remove that reload.
 *
 * This hook is the enhancement that removes the reload. It intercepts the form's own
 * `submit` event and replaces the native navigation with a Next.js client-side
 * `router.push` to the exact same URL the browser would have built. Because it hangs
 * off the SUBMIT event (not a specific control's change), every way of submitting the
 * form — the `<select>` auto-submit, the Apply button, a keyboard Enter — flows through
 * the one intercepted path. With JS off, nothing here runs and the plain GET form still
 * submits natively: a pure progressive enhancement, same doctrine as every other
 * JS-optional control in this app.
 *
 * `scroll: false` is not optional: re-sorting a long results list must hold the reader's
 * scroll position, not fling them to the top of the page on every change.
 *
 * Reusable by design — QOL-I will hang the same hook off the filter form.
 */
export function useSoftGetForm(formRef: RefObject<HTMLFormElement | null>): void {
  const router = useRouter();

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    function onSubmit(event: SubmitEvent) {
      const target = event.currentTarget as HTMLFormElement | null;
      if (!target) return;
      // Replace the native document navigation with a client-side one. `new FormData`
      // reads the form the same way a native GET submit would.
      event.preventDefault();
      const url = softGetTarget(
        target.getAttribute('action'),
        new FormData(target),
        window.location.href,
      );
      router.push(url, { scroll: false });
    }

    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [formRef, router]);
}

/**
 * Auto-submits a form when a control matching `selector` fires a `change`, debounced —
 * QOL-I item 2, for the filter panel's checkboxes.
 *
 * Delegated at the FORM level (one listener, not one island per checkbox) and filtered by
 * `selector` so it fires ONLY for the controls that want it: the filter `<select>`s do
 * their own pointer-vs-keyboard gating in {@link AutoSubmitSelect} and must be excluded
 * here, or a keyboard arrow through the Category select would navigate mid-choice — the
 * exact bug that gating exists to prevent. Pass e.g. `input[type=checkbox]`.
 *
 * DEBOUNCED because each submit is a live query against the whole catalog: ticking three
 * boxes quickly should be one navigation, not three. `requestSubmit()` (not `submit()`)
 * routes through {@link useSoftGetForm}'s interception, so the auto-apply is a soft client
 * navigation like every other submit of this form. No-op when `selector` is omitted, so
 * the same SoftGetForm serves the sort form (no auto-apply) unchanged.
 */
export function useAutoSubmitOnChange(
  formRef: RefObject<HTMLFormElement | null>,
  selector?: string,
  debounceMs = 200,
): void {
  useEffect(() => {
    const form = formRef.current;
    if (!form || !selector) return;
    const sel = selector;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function onChange(event: Event) {
      const target = event.target;
      if (!(target instanceof Element) || !target.matches(sel)) return;
      clearTimeout(timer);
      timer = setTimeout(() => form?.requestSubmit(), debounceMs);
    }

    form.addEventListener('change', onChange);
    return () => {
      clearTimeout(timer);
      form.removeEventListener('change', onChange);
    };
  }, [formRef, selector, debounceMs]);
}

/**
 * Builds the exact URL a native GET submission would navigate to, as a root-relative
 * path Next's router can push.
 *
 * Pulled out as a pure function so the URL-building — the one piece of real logic here —
 * is unit-testable without a DOM/router (this repo runs vitest in `node`, not jsdom, and
 * Node's `FormData` constructor can't read a form element). It mirrors native behaviour:
 * every named control, in document order, with repeats preserved (so
 * `?difficulty=2&difficulty=3` survives), and the form's own `action` as the destination —
 * with two deliberate omissions that only make the URL cleaner without changing meaning:
 * empty-string values (an unselected `<select>`) and `File` values (a GET form has none).
 */
export function softGetTarget(
  actionAttr: string | null,
  formData: FormData,
  baseHref: string,
): string {
  const params = new URLSearchParams();
  for (const [name, value] of formData) {
    // Skip empty values: an unselected `<select>` (Any category / Any time) submits an
    // empty string, and `?category=&time=` is just noise — `parseFilters` drops it anyway.
    // Omitting it keeps an auto-applied URL as clean as the `buildQueryString` links.
    if (typeof value === 'string' && value !== '') params.append(name, value);
  }

  // Resolve the action against the current location so an empty or "/" action still
  // yields a clean pathname; drop everything but the path (native GET replaces the
  // query wholesale, it does not merge with the action's own).
  const action = new URL(actionAttr ?? '', baseHref);
  const qs = params.toString();
  return qs ? `${action.pathname}?${qs}` : action.pathname;
}
