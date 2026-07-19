import { TextInput } from '@woodworking-plan/ui';

export function SearchField() {
  return (
    <div style={{ display: 'flex', width: '22rem', maxWidth: '100%' }}>
      <TextInput placeholder="Search plans…" defaultValue="cedar planter" />
    </div>
  );
}

export function EmptyField() {
  return (
    <div style={{ display: 'flex', width: '22rem', maxWidth: '100%' }}>
      <TextInput placeholder="New collection name" />
    </div>
  );
}
