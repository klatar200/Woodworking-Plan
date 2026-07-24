import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { PlanSteps } from '@/components/plan-steps';

/**
 * Step images on the build guide (2026-07-24).
 *
 * Content already carries steps[].image; the gap was seed → DB → PlanSteps.
 * These tests lock the render contract and the CSS size gates that keep every
 * plan's step media in the same footprint.
 */

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

const steps = [
  {
    id: 's1',
    stepNumber: 1,
    title: 'Assemble Legs',
    body: 'Attach the boards.',
    imageUrl: 'https://cdn.example/plans/legs.webp',
    tools: [],
    materials: [],
  },
  {
    id: 's2',
    stepNumber: 2,
    title: 'Finish',
    body: 'Sand and oil.',
    imageUrl: null,
    tools: [],
    materials: [],
  },
];

const images = [
  { url: 'https://cdn.example/plans/legs.webp', alt: 'Leg assembly layout' },
];

describe('PlanSteps step images', () => {
  it('renders an image when imageUrl is set, using the plan gallery alt', () => {
    const html = renderToStaticMarkup(
      <PlanSteps steps={steps} images={images} />,
    );

    expect(html).toContain('step-image');
    expect(html).toContain('https://cdn.example/plans/legs.webp');
    expect(html).toContain('alt="Leg assembly layout"');
  });

  it('omits the figure when imageUrl is null', () => {
    const html = renderToStaticMarkup(
      <PlanSteps steps={steps} images={images} />,
    );

    // Only step 1 has media.
    expect(html.match(/class="step-image"/g)?.length).toBe(1);
    expect(html).toContain('Finish');
  });

  it('falls back to the step title when the gallery has no matching alt', () => {
    const html = renderToStaticMarkup(
      <PlanSteps
        steps={[
          {
            ...steps[0]!,
            imageUrl: 'https://cdn.example/orphan.webp',
          },
        ]}
        images={images}
      />,
    );

    expect(html).toContain('alt="Assemble Legs"');
  });
});

describe('step-image CSS size gates', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../src/app/globals.css', import.meta.url)),
    'utf8',
  );

  it('caps desktop step images at 320×240', () => {
    expect(css).toMatch(/\.step-image\s*\{[^}]*--step-img-max-w:\s*320px/s);
    expect(css).toMatch(/\.step-image\s*\{[^}]*--step-img-max-h:\s*240px/s);
  });

  it('caps mobile step images at max-height 200px', () => {
    expect(css).toContain('--step-img-max-h: 200px');
    expect(css).toMatch(/@media\s*\(max-width:\s*63\.99rem\)/);
  });

  it('uses object-fit: cover so sources share one footprint', () => {
    expect(css).toMatch(/\.step-image-img\s*\{[^}]*object-fit:\s*cover/s);
  });
});
