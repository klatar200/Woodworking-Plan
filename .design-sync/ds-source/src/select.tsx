import * as React from 'react';

const control =
  'min-h-[2.75rem] px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** When true, the control stretches to fill its container (filter panel). */
  fullWidth?: boolean;
}

/**
 * A `<select>` control — 44px tall, 16px font (no iOS zoom on focus). Used by
 * the filter panel, the sort control, and the shopping-list scope switcher.
 * Pass `fullWidth` where the original stretched to its container.
 */
export function Select({
  fullWidth = false,
  className = '',
  children,
  ...rest
}: SelectProps) {
  return (
    <select
      className={`${control}${fullWidth ? ' w-full' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}
