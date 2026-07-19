import * as React from 'react';

const label =
  'inline-block text-[0.75rem] uppercase tracking-[0.06em] text-muted mb-[0.375rem]';

export interface CategoryLabelProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * The small uppercase category eyebrow shown above a plan's title on catalog
 * cards, the plan-detail header, and the builds list. Muted colour, wide
 * letter-spacing, a little space below.
 */
export function CategoryLabel({ className = '', children, ...rest }: CategoryLabelProps) {
  return (
    <span className={`${label} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
