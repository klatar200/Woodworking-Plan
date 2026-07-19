import * as React from 'react';

const pill =
  'inline-flex items-center gap-[0.4375rem] min-h-[2.5rem] py-0 pr-[0.75rem] pl-[0.625rem] border border-border rounded-[999px] text-[0.875rem] cursor-pointer has-[input:checked]:border-fg has-[input:checked]:bg-accent has-[input:checked]:text-accent-fg has-[input:checked]:font-bold has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ok has-[input:focus-visible]:outline-offset-2';

export interface CheckboxPillProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** The visible pill label. */
  label: React.ReactNode;
}

/**
 * A filter checkbox rendered as a pill (used by the filter panel and the
 * "My Workshop" tool picker). The checked and focus styling is driven by
 * `:has()` on the nested input, so the whole `<label>` fills with the accent
 * when its checkbox is checked — no JavaScript and no class juggling.
 */
export function CheckboxPill({
  label,
  className = '',
  ...rest
}: CheckboxPillProps) {
  return (
    <label className={`${pill} ${className}`.trim()}>
      <input type="checkbox" className="m-0 accent-[var(--fg)]" {...rest} />
      {label}
    </label>
  );
}
