import { Chip } from '@woodworking-plan/ui';

export function FilterChips() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip active>Beginner</Chip>
      <Chip>Outdoor</Chip>
      <Chip>Weekend build</Chip>
      <Chip active>Hand tools only</Chip>
    </div>
  );
}

export function CollectionTabs() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip active>All saved</Chip>
      <Chip>Shop projects</Chip>
      <Chip>Gifts</Chip>
    </div>
  );
}
