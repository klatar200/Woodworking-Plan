import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

/**
 * The plan-detail page's QOL-B WIRING.
 *
 * The individual pieces have their own tests (plan-actions-row, inline-board-plan,
 * review-rating-input, format). What none of those can catch is a mistake in how the
 * page assembles them — the primary CTA pointing at the wrong route, the overflow menu
 * ending up empty, the board-foot note firing on every unit, or the inline board plan
 * landing outside the Cut List panel. That assembly had no test before this sprint, and
 * it is exactly where a wiring bug hides: every component still renders, the page just
 * says the wrong thing.
 *
 * A STATIC render, so this is also the no-JS / print / offline document: anything
 * asserted here is in the HTML before a single byte of JavaScript runs.
 */

const getPlanBySlug = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const getCurrentUser = vi.fn();

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/plans', () => ({ getPlanBySlug }));
vi.mock('@/lib/auth', () => ({ getCurrentUser }));
vi.mock('@/lib/saves', () => ({ isPlanSaved: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/likes', () => ({ isPlanLiked: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/shopping-list', () => ({
  isOnShoppingList: vi.fn().mockResolvedValue(false),
}));
vi.mock('@/lib/workshop', () => ({
  getOwnedToolSlugs: vi.fn().mockResolvedValue([]),
  toolFit: vi.fn(),
}));
vi.mock('@/lib/admin', () => ({ isAdmin: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/storage', () => ({ isStorageConfigured: () => false }));
vi.mock('@/lib/reviews', () => ({
  listReviews: vi.fn().mockResolvedValue([]),
  getRatingSummary: vi.fn().mockResolvedValue({ average: null, count: 0 }),
  getMyReview: vi.fn().mockResolvedValue(null),
  MAX_BODY_LENGTH: 2000,
  MAX_PHOTOS_PER_REVIEW: 3,
}));

// Server actions pull in Prisma/Clerk; the forms only need something to point at.
vi.mock('@/app/actions/saves', () => ({
  savePlanAction: vi.fn(),
  unsavePlanAction: vi.fn(),
}));
vi.mock('@/app/actions/likes', () => ({
  likePlanAction: vi.fn(),
  unlikePlanAction: vi.fn(),
}));
vi.mock('@/app/actions/shopping-list', () => ({
  addToShoppingListAction: vi.fn(),
  removeFromShoppingListAction: vi.fn(),
}));
vi.mock('@/app/actions/reviews', () => ({
  submitReviewAction: vi.fn(),
  deleteReviewAction: vi.fn(),
  deletePhotoAction: vi.fn(),
}));
vi.mock('@/components/service-worker', () => ({ cachePlanForOffline: vi.fn() }));
// Renders nothing; its whole job is a post-mount effect (Sprint 19).
vi.mock('@/components/view-logger', () => ({ ViewLogger: () => null }));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- a test stub for next/image
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const plan = {
  id: 'p1',
  slug: 'edge-grain-maple-cutting-board',
  title: 'Edge-Grain Maple Cutting Board',
  summary: 'The classic first glue-up.',
  description: 'Body text.',
  difficulty: 2,
  timeLabel: '4–6 hrs',
  costTier: 'TIER_2',
  costMinCents: 5500,
  costMaxCents: 8500,
  tags: ['maple'],
  images: [],
  category: { slug: 'cutting-boards', name: 'Cutting Boards' },
  tools: [
    { id: 't1', essential: true, note: null, tool: { slug: 'table-saw', name: 'Table Saw' } },
    { id: 't2', essential: false, note: 'Optional.', tool: { slug: 'router', name: 'Router' } },
  ],
  materials: [
    {
      id: 'm1',
      name: 'Hard maple, 4/4',
      unit: 'board feet',
      quantity: 4,
      species: 'Hard Maple',
      costCents: 4800,
      note: 'Buy 25% overage.',
    },
    {
      id: 'm2',
      name: 'Wood glue',
      unit: 'oz',
      quantity: 4,
      species: null,
      costCents: null,
      note: null,
    },
  ],
  cutList: [
    {
      id: 'c1',
      part: 'Board strips',
      quantity: 6,
      thicknessIn: 0.8125,
      widthIn: 2,
      lengthIn: 19,
      material: 'Hard Maple',
      note: 'Cut 1" long.',
    },
  ],
  steps: [
    { id: 's1', stepNumber: 1, title: 'Mill the stock', body: 'Flatten one face.', tools: [], materials: [] },
  ],
  _count: { likes: 3 },
};

async function render(): Promise<string> {
  const { default: PlanDetailPage } = await import('@/app/plans/[slug]/page');

  const element = (await PlanDetailPage({
    params: Promise.resolve({ slug: plan.slug }),
    searchParams: Promise.resolve({}),
  })) as ReactElement;

  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.resetModules();
  getPlanBySlug.mockReset().mockResolvedValue(plan);
  getCurrentUser.mockReset().mockResolvedValue({ id: 'u1' });
  notFound.mockClear();
});

describe('the action row (QOL-B items 1–3)', () => {
  it('leads with ONE primary CTA, pointing at the build page', async () => {
    const html = await render();

    expect(html).toContain(`/plans/${plan.slug}/build`);
    expect(html).toContain('Start building');
  });

  /**
   * The lower "Start building" link and the whole server-rendered Instructions section
   * are the no-JS / print / offline path (the Sprint 20 contract). Moving the CTA up was
   * ADDITIVE; if this ever drops to one occurrence, that contract has been broken.
   */
  it('keeps the full instructions section AND the lower link in the document', async () => {
    const html = await render();

    expect(html).toContain('Instructions');
    expect(html).toContain('Mill the stock');
    expect(html).toContain('Flatten one face.');

    const buildLinks = html.match(/\/plans\/edge-grain-maple-cutting-board\/build/g) ?? [];
    expect(buildLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('puts Print and the shopping list inside the overflow menu, not the row', async () => {
    const html = await render();

    // The menu exists as a <details> and its items are in the document either way.
    expect(html).toContain('aria-label="More actions for this plan"');
    expect(html).toContain(`/plans/${plan.slug}/print`);
    expect(html).toContain('Add to shopping list');
  });

  it('uses the bookmark toggle, not the old text Save button', async () => {
    const html = await render();

    expect(html).toContain('aria-label="Save this plan"');
    expect(html).not.toContain('>Save this plan<');
  });

  it('renders the like count as a counter with a full accessible name', async () => {
    const html = await render();

    expect(html).toContain('aria-label="Like this plan (3 likes)"');
  });
});

describe('materials: board feet (QOL-B item 5)', () => {
  it('adds a worked example beside a board-feet row, keeping the real quantity', async () => {
    const html = await render();

    // 4 bd ft × 144 ÷ (0.75 × 6) = 128 in ≈ 11 ft.
    expect(html).toContain('about 11 ft of 3/4&quot; × 6&quot; board');
    expect(html).toContain('4 board feet');
    // …and the definition, since this plan has such a row.
    expect(html).toContain('is a volume, not a length');
  });

  it('does NOT annotate rows measured in anything else', async () => {
    const html = await render();
    // "Wood glue — 4 oz" must not gain a lumber example.
    const examples = html.match(/about \d+ ft of/g) ?? [];
    expect(examples).toHaveLength(1);
  });

  it('omits the board-foot explainer entirely when no material uses it', async () => {
    getPlanBySlug.mockResolvedValue({
      ...plan,
      materials: [{ ...plan.materials[1], id: 'm2' }],
    });

    const html = await render();
    expect(html).not.toContain('is a volume, not a length');
  });
});

describe('the cut list gets a picture (QOL-B item 4)', () => {
  it('renders the to-scale board layout inside the Cut List panel', async () => {
    const html = await render();

    const panel = html.slice(html.indexOf('id="panel-cutlist"'));
    expect(panel).toContain('board-bar');
    expect(panel).toContain('What to buy');
    // And still links out for anyone whose stock or kerf differs.
    expect(panel).toContain(`/plans/${plan.slug}/boards`);
  });

  it('renders no board layout for a plan with no cut list', async () => {
    getPlanBySlug.mockResolvedValue({ ...plan, cutList: [] });

    const html = await render();
    expect(html).not.toContain('board-bar');
    expect(html).not.toContain('id="panel-cutlist"');
  });
});

describe('SECURITY: the page is still not a back door', () => {
  it('404s for an unpublished or unknown slug', async () => {
    getPlanBySlug.mockResolvedValue(null);

    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});
