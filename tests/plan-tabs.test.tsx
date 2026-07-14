import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanTabs } from '@/components/plan-tabs';
import { InstructionsDisclosure } from '@/components/instructions-disclosure';
import { StepWalker } from '@/components/step-walker';

/**
 * Sprint 20 — the plan-detail redesign's progressive-enhancement contract.
 *
 * All three of these components share StepWalker's promise: the enhancement lives in a
 * `useEffect`, which React SSR never runs, so a static render is exactly what a no-JS
 * visitor, a crawler, and the print stylesheet act on. That render must contain the FULL
 * document — every panel, every step — because print/offline/no-JS depend on it. These
 * tests assert that, since it is the one property whose failure would be invisible until
 * someone printed a cut list and got a blank page.
 */

describe('PlanTabs — server render (no JS yet)', () => {
  const panels = (
    <>
      <section data-tab="tools">
        <h2>Tools</h2>
        Tools content
      </section>
      <section data-tab="materials">
        <h2>Materials</h2>
        Materials content
      </section>
      <section data-tab="cutlist">
        <h2>Cut list</h2>
        Cut list content
      </section>
    </>
  );

  const tabs = [
    { id: 'tools', label: 'Tools', present: true },
    { id: 'materials', label: 'Materials', present: true },
    { id: 'cutlist', label: 'Cut list', present: true },
  ];

  it('renders every panel in full, with no tablist and nothing hidden', () => {
    const html = renderToStaticMarkup(<PlanTabs tabs={tabs}>{panels}</PlanTabs>);

    expect(html).toContain('Tools content');
    expect(html).toContain('Materials content');
    expect(html).toContain('Cut list content');
    // The tab bar is JS-only chrome — a tab button with no handler is a dead control.
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('plan-tab-active');
    // No panel is hidden before mount.
    expect(html).not.toContain('display:none');
    expect(html).not.toContain('hidden');
  });

  it('keeps every panel in the DOM regardless of the present flags', () => {
    // `present: false` suppresses a TAB, never a PANEL — the page already omits an
    // absent section (e.g. a plan with no cut list renders no cut-list panel at all).
    // What must never happen is the panel being in the tree but dropped by this
    // component, which would take it out of print and no-JS too.
    const html = renderToStaticMarkup(
      <PlanTabs
        tabs={[
          { id: 'tools', label: 'Tools', present: true },
          { id: 'materials', label: 'Materials', present: true },
          { id: 'cutlist', label: 'Cut list', present: false },
        ]}
      >
        {panels}
      </PlanTabs>,
    );

    expect(html).toContain('Cut list content');
  });
});

describe('InstructionsDisclosure — server render (no JS yet)', () => {
  it('renders instructions OPEN and shows no button before mount', () => {
    const html = renderToStaticMarkup(
      <InstructionsDisclosure>
        <section>Every build step, in full</section>
      </InstructionsDisclosure>,
    );

    expect(html).toContain('Every build step, in full');
    // The region is not hidden without JS.
    expect(html).not.toContain('hidden');
    // The "Start building" button does nothing without JS, so it isn't rendered.
    expect(html).not.toContain('instructions-open');
  });
});

describe('StepWalker last-step CTA (Sprint 20)', () => {
  const steps = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <li key={i} className="step" data-step={i + 1}>
        Step {i + 1}
      </li>
    ));

  it('does NOT render the CTA at server-render time (it is enhancement-only)', () => {
    const html = renderToStaticMarkup(
      <StepWalker stepTitles={['One', 'Two']} reviewCtaHref="#reviews-heading">
        <ol>{steps(2)}</ol>
      </StepWalker>,
    );

    // The CTA appears only once JS has taken over the step list AND the user is on the
    // last step — never in the static document, print, or no-JS.
    expect(html).not.toContain('step-finish-cta');
  });

  it('still renders a single-step plan byte-identical to its children', () => {
    // The CTA prop must not disturb the single-step passthrough the walker has always
    // guaranteed.
    const html = renderToStaticMarkup(
      <StepWalker stepTitles={['Only']} reviewCtaHref="#reviews-heading">
        <ol>{steps(1)}</ol>
      </StepWalker>,
    );

    expect(html).toBe(renderToStaticMarkup(<ol>{steps(1)}</ol>));
  });
});
