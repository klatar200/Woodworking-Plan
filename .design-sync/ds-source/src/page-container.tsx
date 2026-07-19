import * as React from 'react';

const WIDTHS = {
  /** The default mobile-first reading column. */
  default: 'max-w-[40rem]',
  /** Wider shell for content-heavy pages (plan detail). */
  wide: 'max-w-[64rem]',
  /** Full-bleed shell for the catalog grid. */
  catalog: 'max-w-none',
} as const;

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Reading-column width. Defaults to the 40rem mobile-first column. */
  width?: 'default' | 'wide' | 'catalog';
}

/**
 * The page container — a centred, mobile-first column with safe-area-aware
 * padding (respects the phone notch / home indicator) and a wider gutter once
 * the desktop breakpoint is reached. Wrap a page's content in it.
 */
export function PageContainer({
  width = 'default',
  className = '',
  children,
  ...rest
}: PageContainerProps) {
  return (
    <div
      className={`${WIDTHS[width]} mx-auto pt-[2rem] px-[1.25rem] lg:px-[2.5rem] pb-[calc(2rem+env(safe-area-inset-bottom))] ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
