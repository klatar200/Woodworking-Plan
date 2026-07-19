'use client';

import { useRef } from 'react';
import { SORT_OPTIONS, type SortOption } from '@/lib/sort';

interface Props {
  sort: SortOption;
  className: string;
}

/**
 * The sort `<select>` — QOL-A item 3: it auto-applies on change.
 *
 * This is a PROGRESSIVE ENHANCEMENT over the GET form in sort-select.tsx, not a
 * replacement for it. The Apply button stays exactly where it was: with JS off this
 * component still server-renders a plain `<select name="sort">`, and Apply still
 * submits the form. Nothing here is required for the control to work.
 *
 * WHY POINTER-ONLY. `change` on a `<select>` is not a reliable "the user has decided"
 * signal for the keyboard: several browsers fire it on every ↑/↓ while the closed
 * select has focus, so auto-submitting on any change would navigate away mid-choice
 * and strand a keyboard user on the second option in the list. Pointer/touch changes
 * ARE a decision (the picker closes on selection), so those submit immediately — which
 * is the phone case this item was raised for. Keyboard users commit with Enter (native
 * form submit) or the Apply button, both unchanged.
 *
 * `requestSubmit()`, not `submit()`: it fires the form's submit event and runs
 * validation, i.e. it behaves like the Apply button rather than bypassing it.
 */
export function SortSelectControl({ sort, className }: Props) {
  /** True when the pending change came from the keyboard — see the file doc. */
  const fromKeyboard = useRef(false);

  return (
    <select
      id="sort"
      name="sort"
      defaultValue={sort}
      className={className}
      onKeyDown={() => {
        fromKeyboard.current = true;
      }}
      onPointerDown={() => {
        fromKeyboard.current = false;
      }}
      onChange={(event) => {
        if (fromKeyboard.current) return;
        event.currentTarget.form?.requestSubmit();
      }}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
