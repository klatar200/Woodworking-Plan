'use client';

import { useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

type Props = ComponentPropsWithoutRef<'select'>;

/**
 * A `<select>` that auto-submits its form on a POINTER/TOUCH change, but NOT a
 * keyboard one — QOL-A's sort control, generalised in QOL-I so sort, category, time,
 * and page-size all share ONE implementation instead of four copies of this subtle
 * logic (QOL-I item 2).
 *
 * WHY POINTER-ONLY. `change` on a `<select>` is not a reliable "the user has decided"
 * signal for the keyboard: several browsers fire it on every ↑/↓ while the closed
 * select has focus, so auto-submitting on any change would navigate away mid-choice and
 * strand a keyboard user on the second option. Pointer/touch changes ARE a decision (the
 * picker closes on selection), so those submit immediately — the phone case this was
 * raised for. Keyboard users commit with Enter (native submit) or the visually-hidden
 * Apply button, both unchanged.
 *
 * PROGRESSIVE ENHANCEMENT. With JS off this is a plain `<select name=…>` inside a GET
 * form; nothing here is required for the control to work. `requestSubmit()` (not
 * `submit()`) fires the form's submit event, so it runs the SoftGetForm interception and
 * validation exactly like the Apply button rather than bypassing them.
 *
 * Any `onChange`/`onKeyDown`/`onPointerDown` passed in still runs — this composes with a
 * caller's own handlers rather than replacing them.
 */
export function AutoSubmitSelect({
  children,
  onChange,
  onKeyDown,
  onPointerDown,
  ...rest
}: Props) {
  /** True when the pending change came from the keyboard — see the file doc. */
  const fromKeyboard = useRef(false);

  return (
    <select
      {...rest}
      onKeyDown={(event) => {
        fromKeyboard.current = true;
        onKeyDown?.(event);
      }}
      onPointerDown={(event) => {
        fromKeyboard.current = false;
        onPointerDown?.(event);
      }}
      onChange={(event) => {
        onChange?.(event);
        if (fromKeyboard.current) return;
        event.currentTarget.form?.requestSubmit();
      }}
    >
      {children}
    </select>
  );
}
