import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { PlanListItem } from '@/lib/plans';

/**
 * PlanCard `decorative` — the a11y contract for the landing marquee's loop duplicate.
 *
 * A CSS marquee needs two identical copies of its content to loop seamlessly. The second
 * copy is purely visual: it must NOT be a second tab stop (duplicate links) and a screen
 * reader must NOT read the carousel twice. `decorative` marks the card `inert` +
 * `aria-hidden`; the default (real) card stays fully interactive.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
// PlanCard imports these at module load; they only RENDER for signed-in / reviewed cards,
// which this fixture is neither — stub them so the test needs no Clerk/DB.
vi.mock('@/components/save-toggle', () => ({ SaveToggle: () => null }));
vi.mock('@/components/star-rating', () => ({ StarRating: () => null }));

const { PlanCard } = await import('@/components/plan-card');

const plan = {
  id: 'p1',
  slug: 'oak-bench',
  title: 'Oak Bench',
  summary: 'A simple bench.',
  category: { name: 'Furniture', slug: 'furniture' },
  difficulty: 2,
  costTier: 'TIER_2',
  timeMinMinutes: 120,
  timeMaxMinutes: 240,
  images: [],
  _count: { likes: 0 },
} as unknown as PlanListItem;

describe('PlanCard decorative (marquee loop duplicate)', () => {
  it('is fully interactive by default — a real link, not hidden', () => {
    const html = renderToStaticMarkup(<PlanCard plan={plan} />);
    expect(html).toContain('href="/plans/oak-bench"');
    expect(html).not.toContain('inert');
    expect(html).not.toContain('aria-hidden');
  });

  it('is inert + aria-hidden when decorative, so it is not a second tab stop or SR echo', () => {
    const html = renderToStaticMarkup(<PlanCard plan={plan} decorative />);
    expect(html).toContain('inert');
    expect(html).toContain('aria-hidden="true"');
    // The link is still in the markup (the duplicate looks identical) — it's just inert.
    expect(html).toContain('href="/plans/oak-bench"');
  });
});
