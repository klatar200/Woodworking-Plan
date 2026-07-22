import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: FaqPage, metadata } = await import('@/app/faq/page');
const { CONTACT_EMAIL } = await import('@/lib/brand');

const html = renderToStaticMarkup(<FaqPage />);

/**
 * QOL-C — the FAQ accordion.
 *
 * The static render is the whole point of these tests: this page has NO client
 * component and must not acquire one. Everything asserted below is in the document
 * before a byte of JavaScript runs, which is also what a crawler, a print, and a
 * reader with JS off get.
 */
describe('the FAQ is a native <details> accordion', () => {
  it('renders one <details>/<summary> pair per question', () => {
    const details = html.match(/<details/g) ?? [];
    const summaries = html.match(/<summary/g) ?? [];

    expect(details.length).toBe(8);
    expect(summaries.length).toBe(details.length);
  });

  it('carries every ANSWER in the document, not just the questions', () => {
    // A closed <details> still contains its content — so nothing here depends on JS,
    // and find-in-page/assistive tech can reach an answer without a click.
    expect(html).toContain('no ads and no affiliate');
    expect(html).toContain('location (GPS) data stripped');
    expect(html).toContain('13/16');
  });

  it('leaves every item closed, so the page opens as a scannable list of questions', () => {
    expect(html).not.toContain('open=""');
  });

  it('drops the <dl> it replaced — no orphaned dt/dd for deleted CSS to target', () => {
    expect(html).not.toContain('<dl');
    expect(html).not.toContain('<dt>');
    expect(html).not.toContain('<dd>');
    // The `.faq` / `.faq-item` rules were deleted from globals.css with this change.
    expect(html).not.toContain('class="faq');
  });
});

describe('motion is optional (WCAG 2.3.3)', () => {
  it('turns off BOTH transitions under prefers-reduced-motion', () => {
    // The height reveal. (`&` is HTML-escaped inside a class attribute, hence the
    // optional `amp;` — matching the raw source string would silently never fire.)
    expect(html).toMatch(/motion-reduce:\[&(amp;)?::details-content\]:transition-none/);
    // …and the chevron, which is the animation most browsers will actually run.
    expect(html).toContain('motion-reduce:transition-none');
  });

  /**
   * The height transition needs `::details-content` + `interpolate-size`, which this
   * repo already judged too new to depend on (filter-disclosure.tsx). It is safe HERE
   * only because it degrades to an instant open — so the closed state must come from
   * the `<details>` element itself, never from a `hidden` attribute or a display rule
   * that a non-supporting browser would leave stuck shut.
   */
  it('never hides an answer with anything but the <details> element itself', () => {
    expect(html).not.toContain('hidden=""');
    expect(html).toContain('[interpolate-size:allow-keywords]');
  });
});

describe('copy and indexing (rebranded Sprint 43)', () => {
  it('renders the real contact address and keeps the noindex flag', () => {
    // Sprint 43: hello@example.com → the real support mailbox (brand.ts).
    // noindex deliberately did NOT lift with the rename — indexing is a de facto
    // public launch, which is Keagan's explicit go-live call.
    expect(html).toContain(CONTACT_EMAIL);
    expect(html).not.toContain('hello@example.com');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
