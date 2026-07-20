'use client';

import { useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useSoftGetForm, useAutoSubmitOnChange } from '@/lib/use-soft-get-form';

type Props = Omit<ComponentPropsWithoutRef<'form'>, 'method'> & {
  /** Required — the destination the form navigates to, same as a plain GET form. */
  action: string;
  /**
   * QOL-I: when set to a CSS selector, controls matching it auto-submit the form (soft,
   * debounced) on `change` — used for the filter checkboxes (`input[type=checkbox]`).
   * Omitted for the sort form, which has no auto-apply controls of this kind.
   */
  autoSubmitOnChange?: string;
};

/**
 * A GET `<form>` that navigates via the client router instead of reloading the page.
 *
 * A thin client wrapper around {@link useSoftGetForm} so a SERVER component can keep
 * rendering its own form markup (hidden inputs, labels, a `<select>`, a submit button)
 * as `children` and get soft navigation for free — without the whole surrounding
 * component having to become a client component. `method="get"` is forced: this exists
 * specifically for URL-driven browse/search/sort/filter forms.
 *
 * With JS off this still server-renders a plain `<form method="get">`, so the native
 * submit path is untouched.
 */
export function SoftGetForm({ action, children, autoSubmitOnChange, ...rest }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  useSoftGetForm(ref);
  useAutoSubmitOnChange(ref, autoSubmitOnChange);

  return (
    <form ref={ref} action={action} method="get" {...rest}>
      {children}
    </form>
  );
}
