import * as React from 'react';

const chipBase =
  'inline-flex items-center gap-[0.25rem] min-h-[2.5rem] px-[0.875rem] border rounded-[999px] text-[0.875rem] no-underline focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

const RESTING = `${chipBase} border-border text-fg`;
const ACTIVE = `${chipBase} border-fg bg-accent font-bold text-accent-fg`;

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** When true, the chip fills with the accent and reads as selected. */
  active?: boolean;
}

/**
 * A pill chip — used for collection tabs and active-filter chips. `active`
 * fills the pill with the orange accent; its text switches to `--accent-fg`
 * (dark ink in both light and dark themes) so it never becomes unreadable
 * light-on-orange.
 */
export function Chip({
  active = false,
  className = '',
  children,
  ...rest
}: ChipProps) {
  return (
    <span className={`${active ? ACTIVE : RESTING} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
