import { PageContainer, CategoryLabel, Button } from '@woodworking-plan/ui';

export function PlanPage() {
  return (
    <PageContainer>
      <CategoryLabel>Storage</CategoryLabel>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>
        Wall-Mounted Tool Cabinet
      </h1>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--muted)' }}>
        A shallow cabinet that keeps chisels and layout tools at arm&rsquo;s
        reach, with a French-cleat back so it hangs anywhere on the shop wall.
      </p>
      <Button variant="primary">Start building</Button>
    </PageContainer>
  );
}
