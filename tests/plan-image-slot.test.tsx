import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// next/image needs no real optimizer in a static render — a plain <img> stands in.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub, not the real page
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { PlanImageSlot } from '@/components/plan-image-slot';

describe('PlanImageSlot', () => {
  it('renders the primary photo when there is one', () => {
    const html = renderToStaticMarkup(
      <PlanImageSlot
        title="Walnut Cutting Board"
        image={{ url: 'https://blob.example/board.jpg', alt: 'A walnut board' }}
      />,
    );

    expect(html).toContain('src="https://blob.example/board.jpg"');
    expect(html).toContain('alt="A walnut board"');
    expect(html).not.toContain('Photo coming soon');
  });

  it('renders an honest empty placeholder when there is no photo — NOT an AI render', () => {
    // Every one of the 24 plans currently has images: []. The slot must hold the rail's
    // shape without inventing a picture (DECISIONS_LOG.md 2026-07-14 — no AI generation).
    const html = renderToStaticMarkup(<PlanImageSlot title="Walnut Cutting Board" />);

    expect(html).toContain('Photo coming soon');
    expect(html).toContain('No photo yet for Walnut Cutting Board');
    expect(html).not.toContain('<img');
  });
});
