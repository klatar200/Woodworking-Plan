import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepWalker } from '@/components/step-walker';

/**
 * StepWalker's entire safety property is that it degrades to PLAIN CONTENT
 * without JavaScript — see the file doc in step-walker.tsx. `useEffect` never
 * runs during server-side rendering (React SSR does not execute effects), so
 * a static render of this component is exactly what a no-JS visitor, a crawler,
 * or the instant before hydration actually sees. That makes
 * `renderToStaticMarkup` the right tool here, without needing a DOM
 * environment (jsdom) this project doesn't otherwise depend on.
 */

const steps = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <li key={i} className="step" data-step={i + 1}>
      Step {i + 1} content
    </li>
  ));

describe('StepWalker — server render (no JS yet)', () => {
  it('renders every step for a multi-step plan, with none hidden', () => {
    const html = renderToStaticMarkup(
      <StepWalker stepTitles={['First', 'Second', 'Third']}>
        <ol>{steps(3)}</ol>
      </StepWalker>,
    );

    expect(html).toContain('Step 1 content');
    expect(html).toContain('Step 2 content');
    expect(html).toContain('Step 3 content');
    // None of the JS-only chrome exists before mount — a Prev/Next button
    // with no attached handler would be a dead control.
    expect(html).not.toContain('step-walker-nav');
    expect(html).not.toContain('step-rail');
    expect(html).not.toContain('step-dots');
  });

  it('renders children UNCHANGED for a single-step plan (no walker chrome at all)', () => {
    const html = renderToStaticMarkup(
      <StepWalker stepTitles={['Only step']}>
        <ol>{steps(1)}</ol>
      </StepWalker>,
    );

    expect(html).toBe(renderToStaticMarkup(<ol>{steps(1)}</ol>));
  });
});
