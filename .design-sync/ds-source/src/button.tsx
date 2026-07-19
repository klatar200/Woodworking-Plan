import * as React from 'react';

const btnBase =
  'inline-flex items-center min-h-[2.75rem] px-[0.875rem] py-0 rounded-[0.375rem] text-[0.9375rem] font-medium whitespace-nowrap no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

const VARIANTS = {
  /** Transparent fill + border, inherited text — the caller sets its own look. */
  bare: `${btnBase} border border-transparent bg-transparent`,
  /** Outlined, ink text — the default nav/secondary button. */
  ghost: `${btnBase} border border-border bg-transparent text-fg`,
  /** Solid ink fill, surface text — the single primary CTA per view. */
  primary: `${btnBase} border border-transparent bg-fg text-surface`,
  /** Ghost outline with error-red text — destructive actions. */
  danger: `${btnBase} border border-border bg-transparent text-err`,
  /** The "liked" active state — ink border + ink text. */
  liked: `${btnBase} border border-fg bg-transparent text-fg`,
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant. `primary` is the single call-to-action per view; `ghost`
   * is the default secondary button; `danger` marks a destructive action;
   * `liked` is the active/toggled state; `bare` sets no colour of its own.
   */
  variant?: 'ghost' | 'primary' | 'danger' | 'liked' | 'bare';
}

/**
 * The shared button. A 44px minimum touch target (phones, gloves, sawdust)
 * and a visible focus-visible ring. Colour lives per-variant so Tailwind's
 * fixed source order never lets a base rule erase a variant outline.
 */
export function Button({
  variant = 'ghost',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${VARIANTS[variant]} ${className}`.trim()}
      {...rest}
    />
  );
}
