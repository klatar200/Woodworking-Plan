import { CheckboxPill } from '@woodworking-plan/ui';

export function ToolPicker() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <CheckboxPill label="Table saw" defaultChecked />
      <CheckboxPill label="Router" />
      <CheckboxPill label="Drill / driver" defaultChecked />
      <CheckboxPill label="Orbital sander" />
      <CheckboxPill label="Miter saw" />
    </div>
  );
}
