import { Button } from '@woodworking-plan/ui';

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary">Start building</Button>
      <Button variant="ghost">View details</Button>
      <Button variant="liked">♥ Liked</Button>
      <Button variant="danger">Remove</Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <Button variant="ghost" disabled>
        ← Previous
      </Button>
      <Button variant="primary" disabled>
        Next step →
      </Button>
    </div>
  );
}
