import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// `vi.mock` is hoisted above the imports, so the mock fn has to be hoisted with it —
// a plain `const` above a static `import { ViewLogger }` is read before it exists.
const { recordPlanViewAction } = vi.hoisted(() => ({
  recordPlanViewAction: vi.fn(),
}));

vi.mock('@/app/actions/views', () => ({ recordPlanViewAction }));

import { ViewLogger } from '@/components/view-logger';

/**
 * The property that makes the whole Trending sort trustworthy: A SERVER RENDER LOGS
 * NOTHING.
 *
 * `next/link` prefetches the RSC payload of every catalog card in the viewport, which
 * renders the plan page ON THE SERVER. If a view were logged during that render,
 * hovering the catalog would log a view for every card — and Trending would become
 * "whatever was near the top of the grid", a loop that entrenches its own output.
 * Crawlers would count too.
 *
 * React SSR never runs effects, so a static render is exactly what a prefetch, a
 * crawler, and the moment before hydration see. Asserting it here is asserting that
 * the count means something.
 */
describe('ViewLogger', () => {
  it('renders nothing and logs nothing during a server render', () => {
    const html = renderToStaticMarkup(<ViewLogger slug="maple-cutting-board" />);

    expect(html).toBe('');
    // A prefetch is not a view.
    expect(recordPlanViewAction).not.toHaveBeenCalled();
  });
});
