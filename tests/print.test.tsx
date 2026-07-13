import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

/**
 * The print view — Sprint 13.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE WHOLE POINT OF THIS SPRINT IS THAT THE SHEET WORKS WITH NO SIGNAL.
 *
 * That is why it is a PAGE and not a server-generated PDF: a PDF endpoint requires a
 * network round-trip to produce, which makes it the least offline-capable option
 * available, in the one sprint whose purpose is offline. The tests that matter here
 * are therefore:
 *
 *   1. The print route is CACHEABLE by the service worker (offline.test.ts asserts the
 *      policy; here we assert the page itself renders standalone).
 *   2. The cut list prints TAPE-MEASURE FRACTIONS, not decimals. 0.8125" is not a
 *      thing you can measure. This is the standing rule from Sprint 1 and it matters
 *      most on the sheet that actually goes to the saw.
 *   3. An unpublished plan 404s here too — a print route is not a back door into
 *      staged content.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const getPlanBySlug = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('@/lib/plans', () => ({ getPlanBySlug }));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const plan = {
  id: 'p1',
  slug: 'edge-grain-maple-cutting-board',
  title: 'Edge-Grain Maple Cutting Board',
  summary: 'The classic first glue-up.',
  description: 'Body text.',
  difficulty: 2,
  timeLabel: '4–6 hrs',
  // The tier is what the print view renders. The cents columns stay because they are
  // what DERIVES a tier elsewhere (the shopping list) — but nothing prints them.
  costTier: 'TIER_2',
  costMinCents: 5500,
  costMaxCents: 8500,
  tags: ['maple'],
  category: { slug: 'cutting-boards', name: 'Cutting Boards' },
  tools: [
    { id: 't1', essential: true, note: null, tool: { name: 'Table Saw' } },
    { id: 't2', essential: false, note: 'Optional.', tool: { name: 'Router' } },
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
      // 0.8125 in decimal — must NEVER print as a decimal.
      thicknessIn: 0.8125,
      widthIn: 2,
      lengthIn: 19,
      material: 'Hard Maple',
      note: 'Cut 1" long.',
    },
  ],
  steps: [
    { id: 's1', stepNumber: 1, title: 'Mill the stock', body: 'Flatten one face.' },
    { id: 's2', stepNumber: 2, title: 'Rip the strips', body: 'Six at 2".' },
  ],
  _count: { likes: 0 },
};

async function render(slug: string, view?: string): Promise<string> {
  const { default: PlanPrintPage } = await import('@/app/plans/[slug]/print/page');

  const element = (await PlanPrintPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(view ? { view } : {}),
  })) as ReactElement;

  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.resetModules();
  getPlanBySlug.mockReset().mockResolvedValue(plan);
  notFound.mockClear();
});

describe('SECURITY: the print route is not a back door', () => {
  it('404s for an unpublished or unknown plan', async () => {
    // getPlanBySlug returns null for BOTH — enforced in the data layer, so the print
    // route inherits it rather than re-implementing (and forgetting) the check.
    getPlanBySlug.mockResolvedValue(null);

    await expect(render('staged-plan')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});

describe('the CUT LIST is the reason this page exists', () => {
  it('prints TAPE-MEASURE FRACTIONS, never decimals', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    // 13/16" is what is printed on the blade and the rule. 0.8125" is not a thing you
    // can measure, and a decimal cut list is unusable in a workshop.
    expect(html).toContain('13/16');
    expect(html).not.toContain('0.8125');
  });

  it('renders the cut list BEFORE the instructions', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    // It is the sheet you look at every thirty seconds mid-build. Burying it under
    // four pages of prose is how you end up flipping paper with sawdust on your hands.
    expect(html.indexOf('Cut list')).toBeLessThan(html.indexOf('Instructions'));
  });

  it('includes a tick column — a pencil is the interaction model on paper', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    // React emits the CHARACTER, not the HTML entity, so assert the character.
    expect(html).toContain('☐'); // ☐ ballot box
  });
});

describe('two layouts, because they are two different jobs', () => {
  it('the FULL view has tools and every step', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    expect(html).toContain('Instructions');
    expect(html).toContain('Mill the stock');
    expect(html).toContain('Rip the strips');
    expect(html).toContain('Table Saw');
  });

  it('the CUT-LIST view drops the steps and tools, keeping it to one page', async () => {
    const html = await render('edge-grain-maple-cutting-board', 'cutlist');

    // Still has the workshop data...
    expect(html).toContain('Cut list');
    expect(html).toContain('13/16');
    expect(html).toContain('Materials');

    // ...and none of the prose that would push it onto a second sheet.
    expect(html).not.toContain('Instructions');
    expect(html).not.toContain('Mill the stock');
  });

  it('an unknown ?view value falls back to the full plan rather than erroring', async () => {
    const html = await render('edge-grain-maple-cutting-board', 'garbage');

    // Never trust the query string. Anything that isn't 'cutlist' is the full plan.
    expect(html).toContain('Instructions');
  });
});

describe('materials on paper: a cost BAND, never a dollar figure', () => {
  it('prints NO dollar amounts at all', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    // DECISIONS_LOG.md 2026-07-13 — tiers only. A price on a printed sheet is the most
    // durable wrong number we could produce: it goes on a wall and is read for months
    // after lumber has moved.
    expect(html).not.toMatch(/\$\d/); // no "$48", no "$1,300"
  });

  it('prints the cost TIER instead', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    // The plan is TIER_2. The band still does the decision-relevant job: this is a
    // modest project, not a $10 one and not a $700 one.
    expect(html).toContain('$$ of $$$$$');
  });
});

describe('the printed sheet knows where it came from', () => {
  it('prints the plan URL in the footer', async () => {
    const html = await render('edge-grain-maple-cutting-board');

    // A cut list found on a bench six months later should lead you back to the plan.
    expect(html).toContain('edge-grain-maple-cutting-board');
  });
});
