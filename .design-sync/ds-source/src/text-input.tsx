import * as React from 'react';

const input =
  'flex-auto min-w-0 min-h-[2.75rem] px-[0.875rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-1';

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * A text input — 44px tall, 16px font (small enough, and 16px stops iOS from
 * zooming the viewport on focus). Used by the catalog search box and the
 * "new collection" field. The focus ring matches the buttons'.
 */
export function TextInput({ className = '', type = 'text', ...rest }: TextInputProps) {
  return (
    <input type={type} className={`${input} ${className}`.trim()} {...rest} />
  );
}
