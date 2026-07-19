import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

/**
 * QOL-B items 1–3 — the plan page's action row: bookmark toggle, like counter, and the
 * "…" overflow menu.
 *
 * Every one of these is a write path or a navigation affordance that this app has
 * promised works WITHOUT JavaScript. That promise is what these tests hold: a plain
 * <form>, a real <details>, a real <a> — never a control that only exists once a
 * bundle has hydrated. The styling is not asserted; the mechanism is.
 */

// The server actions pull in Prisma/Clerk; the components under test only need
// something referentially stable to hand to `<form action={…}>`.
vi.mock('@/app/actions/saves', () => ({
  savePlanAction: vi.fn(),
  unsavePlanAction: vi.fn(),
}));
vi.mock('@/app/actions/likes', () => ({
  likePlanAction: vi.fn(),
  unlikePlanAction: vi.fn(),
}));
vi.mock('@/components/service-worker', () => ({ cachePlanForOffline: vi.fn() }));
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

const { SaveToggle } = await import('@/components/save-toggle');
const { LikeButton } = await import('@/components/like-button');
const { OverflowMenu } = await import('@/components/overflow-menu');

describe('SaveToggle — now the plan page\'s save control too (QOL-B item 2)', () => {
  it('is a real form for a signed-in viewer, so the save needs no JS', () => {
    const html = renderToStaticMarkup(
      <SaveToggle planId="p1" slug="oak-bench" isSaved={false} />,
    );

    expect(html).toContain('<form');
    expect(html).toContain('name="planId" value="p1"');
    expect(html).toContain('name="slug" value="oak-bench"');
    expect(html).toContain('type="submit"');
    // A toggle, announced as one.
    expect(html).toContain('aria-pressed="false"');
  });

  it('gives an ANONYMOUS viewer a sign-in door, not a disabled button', () => {
    const html = renderToStaticMarkup(
      <SaveToggle planId="p1" slug="oak-bench" isSaved={false} isSignedIn={false} />,
    );

    // The plan page is public by design (§12 gates the save, not the content).
    expect(html).toContain('/sign-in?redirect_url=%2Fplans%2Foak-bench');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('<form');
  });

  /**
   * The catalog card is the older call site and must be untouched by this refactor:
   * its overlay position lives in the DEFAULT `className`, so a signature change that
   * dropped the default would silently unpin every card's bookmark.
   */
  it('keeps the catalog card overlay position as the default', () => {
    const html = renderToStaticMarkup(
      <SaveToggle planId="p1" slug="oak-bench" isSaved />,
    );

    expect(html).toContain('absolute top-[0.5rem] right-[0.5rem]');
    expect(html).toContain('aria-pressed="true"');
  });
});

describe('LikeButton reads as a counter (QOL-B item 2)', () => {
  it('shows the number, but the ACCESSIBLE NAME still says "likes"', () => {
    const html = renderToStaticMarkup(
      <LikeButton planId="p1" slug="oak-bench" isLiked={false} likeCount={3} isSignedIn />,
    );

    // Visible text shrank to icon + number…
    expect(html).not.toContain('3 likes<');
    // …the accessible name did not.
    expect(html).toContain('aria-label="Like this plan (3 likes)"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('<form');
  });

  it('says "1 like" (singular) and reflects the liked state', () => {
    const html = renderToStaticMarkup(
      <LikeButton planId="p1" slug="oak-bench" isLiked likeCount={1} isSignedIn />,
    );

    expect(html).toContain('aria-label="Unlike this plan (1 like)"');
    expect(html).toContain('aria-pressed="true"');
  });

  /** Zero is shown, not hidden — hiding it hides the plans that need a first like. */
  it('still shows a zero count', () => {
    const html = renderToStaticMarkup(
      <LikeButton planId="p1" slug="oak-bench" isLiked={false} likeCount={0} isSignedIn />,
    );

    expect(html).toContain('aria-label="Like this plan (0 likes)"');
    expect(html).toMatch(/>\s*0\s*</);
  });
});

describe('OverflowMenu (QOL-B item 3)', () => {
  it('is a native <details>, so it opens with no JavaScript', () => {
    const html = renderToStaticMarkup(
      <OverflowMenu label="More actions for this plan">
        <span data-href="/plans/oak-bench/print">Print / PDF</span>
      </OverflowMenu>,
    );

    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).toContain('aria-label="More actions for this plan"');
    // Closed by default, and its contents are in the document either way — so the
    // items are reachable, cacheable and printable rather than JS-conjured.
    expect(html).not.toContain('open=""');
    expect(html).toContain('/plans/oak-bench/print');
  });
});
