'use client';

import { useEffect, useState } from 'react';

/**
 * A number field you can clear and retype (Sprint 81).
 *
 * The designer used to clamp on every keystroke: clearing a width snapped it to the minimum, so
 * typing "2.25" produced 0.0625225. This keeps what the user types as text and only reports a
 * value once it is a real number inside [min, max]. An unfinished entry is shown as invalid and
 * put back on blur — the design never sees a half-typed number.
 */
export function BoundedNumberInput({
  value,
  min,
  max,
  step,
  integer = false,
  formatBound = String,
  onValue,
  onCommit,
  name,
  className,
  'aria-label': ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Round accepted values to whole numbers. */
  integer?: boolean;
  formatBound?: (n: number) => string;
  /** Called only with an in-range value. */
  onValue: (n: number) => void;
  /** Called on blur, after an invalid entry has been put back. */
  onCommit?: () => void;
  name?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Undo, a template load, or a snap on blur changes the value from outside — show it, but never
  // overwrite what the user is typing.
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const parsed = Number(text);
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max;

  return (
    <>
      <input
        className={className}
        name={name}
        aria-label={ariaLabel}
        type="number"
        min={min}
        max={max}
        step={step}
        value={text}
        aria-invalid={valid ? undefined : true}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setText(next);
          const n = Number(next);
          if (next.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) {
            onValue(integer ? Math.round(n) : n);
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (!valid) setText(String(value));
          onCommit?.();
        }}
      />
      {valid ? null : (
        <span role="status" className="text-[0.8125rem] text-danger">
          {`Enter a number from ${formatBound(min)} to ${formatBound(max)}.`}
        </span>
      )}
    </>
  );
}
