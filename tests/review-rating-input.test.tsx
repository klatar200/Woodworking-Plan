import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

/**
 * QOL-B item 6 — the star-rating INPUT.
 *
 * The whole point of the item was to make rating feel like tapping stars WITHOUT
 * breaking the thing the original comment protected: "a rating that needs JavaScript to
 * be entered is a rating some people cannot leave." So the radios must still be there,
 * still named `rating`, still `required`, still focusable — clipped, never
 * `display: none` (which removes an element from the tab order and from the
 * accessibility tree, i.e. exactly the failure this component was written to avoid).
 */

vi.mock('@/app/actions/reviews', () => ({
  submitReviewAction: vi.fn(),
  deleteReviewAction: vi.fn(),
  deletePhotoAction: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- a test stub for next/image
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const { ReviewsSection } = await import('@/components/reviews-section');

const render = (myRating?: number) =>
  renderToStaticMarkup(
    <ReviewsSection
      planId="p1"
      slug="oak-bench"
      reviews={[]}
      summary={{ average: null, count: 0 }}
      myReview={
        myRating === undefined
          ? null
          : {
              id: 'r1',
              rating: myRating,
              body: null,
              createdAt: new Date('2026-01-01T00:00:00Z'),
              user: { displayName: 'Keagan', imageUrl: null },
              photos: [],
            }
      }
      isSignedIn
      isAdmin={false}
      photosEnabled={false}
    />,
  );

/**
 * Fixed 2026-07-19, from a real console error on `npm run dev`.
 *
 * The file input makes `encType="multipart/form-data"` look mandatory, so it will get
 * "helpfully" re-added. It must not be: when `action` is a server action, React owns the
 * encoding and always submits multipart, overriding the attribute — and warns about it on
 * every render. Uploads never depended on it.
 */
describe('the review form lets React own the encoding', () => {
  it('sets no encType and no method on a server-action form', () => {
    const form = render().match(/<form[^>]*>/)?.[0] ?? '';

    expect(form).toContain('<form');
    expect(form).not.toContain('encType');
    expect(form).not.toContain('enctype');
    expect(form).not.toContain('method=');
  });

  it('still offers the file input the encoding exists for', () => {
    // Guards the other direction: "fixing" the warning by deleting the upload would
    // silence it and remove the feature.
    const html = renderToStaticMarkup(
      <ReviewsSection
        planId="p1"
        slug="oak-bench"
        reviews={[]}
        summary={{ average: null, count: 0 }}
        myReview={null}
        isSignedIn
        isAdmin={false}
        photosEnabled
      />,
    );

    expect(html).toContain('type="file"');
    expect(html).toContain('name="photos"');
  });
});

describe('the star input IS the radio group', () => {
  it('renders five real radios named `rating`, all required', () => {
    const html = render();
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];

    expect(radios).toHaveLength(5);
    for (const radio of radios) {
      expect(radio).toContain('name="rating"');
      expect(radio).toContain('required');
    }
    for (const value of [1, 2, 3, 4, 5]) {
      expect(html).toContain(`value="${value}"`);
      // Each star is that radio's own label — which is what makes clicking work with
      // no JavaScript at all.
      expect(html).toContain(`for="rating-${value}"`);
      expect(html).toContain(`id="rating-${value}"`);
    }
  });

  it('CLIPS the radios rather than hiding them, so they stay focusable', () => {
    const html = render();
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];

    for (const radio of radios) {
      expect(radio).toContain('visually-hidden');
      expect(radio).not.toContain('hidden=');
      expect(radio).not.toContain('display:none');
    }
  });

  /**
   * The reversed DOM order is load-bearing: CSS has no preceding-sibling selector, so
   * "fill this star and every one to its left" is only expressible as `~` over radios
   * ordered 5→1 and painted back the other way with `flex-row-reverse`. Flip either
   * half and the widget fills the wrong stars.
   */
  it('orders the radios 5→1 in the DOM and reverses them visually', () => {
    const html = render();
    const order = [...html.matchAll(/id="rating-(\d)"/g)].map((m) => Number(m[1]));

    expect(order).toEqual([5, 4, 3, 2, 1]);
    expect(html).toContain('flex-row-reverse');
    expect(html).toContain('peer-checked:');
  });

  it('pre-selects the rating you already left', () => {
    const html = render(4);
    const four = html.match(/<input[^>]*id="rating-4"[^>]*>/)?.[0] ?? '';
    const three = html.match(/<input[^>]*id="rating-3"[^>]*>/)?.[0] ?? '';

    expect(four).toContain('checked');
    expect(three).not.toContain('checked');
  });

  it('keeps a text label per star for screen readers', () => {
    const html = render();

    expect(html).toContain('1 star');
    expect(html).toContain('5 stars');
  });
});
