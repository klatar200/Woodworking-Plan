import type { ReactNode } from 'react';

export function FieldHint({ children }: { children: ReactNode }) {
  return <span className="text-[0.8125rem] text-muted">{children}</span>;
}
