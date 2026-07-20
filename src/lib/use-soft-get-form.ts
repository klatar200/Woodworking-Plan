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
 * Builds the exact URL a native GET submission would navigate to, as a root-relative
 * path Next's router can push.
 *
 * Pulled out as a pure function so the URL-building — the one piece of real logic here —
 * is unit-testable without a DOM/router (this repo runs vitest in `node`, not jsdom, and
 * Node's `FormData` constructor can't read a form element). It mirrors native behaviour
 * faithfully: every named control, in document order, with repeats preserved (so
 * `?difficulty=2&difficulty=3` survives), and the form's own `action` as the destination.
 * `File` values are skipped — a GET form has none, and a filename in a query string would
 * be meaningless anyway.
 */
export function softGetTarget(
  actionAttr: string | null,
  formData: FormData,
  baseHref: string,
): string {
  const params = new URLSearchParams();
  for (const [name, value] of formData) {
    if (typeof value === 'string') params.append(name, value);
  }

  // Resolve the action against the current location so an empty or "/" action still
  // yields a clean pathname; drop everything but the path (native GET replaces the
  // query wholesale, it does not merge with the action's own).
  const action = new URL(actionAttr ?? '', baseHref);
  const qs = params.toString();
  return qs ? `${action.pathname}?${qs}` : action.pathname;
}
