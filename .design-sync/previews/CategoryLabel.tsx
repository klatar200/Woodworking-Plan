import { CategoryLabel } from '@woodworking-plan/ui';

export function CardHeader() {
  return (
    <div>
      <CategoryLabel>Outdoor</CategoryLabel>
      <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>
        Cedar Raised Garden Bed
      </h2>
    </div>
  );
}

export function Eyebrows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <CategoryLabel>Storage &amp; shelving</CategoryLabel>
      <CategoryLabel>Furniture</CategoryLabel>
      <CategoryLabel>Shop projects</CategoryLabel>
    </div>
  );
}
