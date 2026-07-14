import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Prose } from '@/components/prose';

/**
 * Before this component existed, every render site did a raw
 * `text.split('\n\n')` with no markdown step at all — so `**bold**`, authored in
 * every one of the 24 plans' step bodies and 9 of their descriptions, rendered as
 * literal asterisks on both the plan detail page and the print page. `.prose
 * strong` in globals.css had existed with nothing driving it. See prose.tsx.
 */
describe('Prose — paragraph + bold rendering', () => {
  it('splits blank-line-separated text into separate <p> tags', () => {
    const html = renderToStaticMarkup(<Prose text={'First paragraph.\n\nSecond paragraph.'} />);

    expect(html).toContain('<p>First paragraph.</p>');
    expect(html).toContain('<p>Second paragraph.</p>');
  });

  it('turns **bold** into <strong>, not literal asterisks', () => {
    const html = renderToStaticMarkup(
      <Prose text={'Set the depth so exactly **1/8" of walnut remains** over each magnet.'} />,
    );

    expect(html).toContain('<strong>1/8&quot; of walnut remains</strong>');
    expect(html).not.toContain('**');
  });

  it('handles more than one bold run in the same paragraph', () => {
    const html = renderToStaticMarkup(
      <Prose text={'Make sure they are all oriented the **same way** — **same pole** facing out.'} />,
    );

    expect(html).toContain('<strong>same way</strong>');
    expect(html).toContain('<strong>same pole</strong>');
    expect(html).not.toContain('**');
  });

  it('leaves plain text with no ** completely unaffected', () => {
    const html = renderToStaticMarkup(<Prose text="Mill both slabs flat." />);

    expect(html).toContain('Mill both slabs flat.');
    expect(html).not.toContain('<strong>');
  });

  it('does not choke on an unmatched/odd "**"', () => {
    // A stray, non-paired ** should render as plain text rather than throw or
    // swallow the rest of the paragraph.
    const html = renderToStaticMarkup(<Prose text="This has ** one lonely marker." />);

    expect(html).toContain('one lonely marker');
  });

  it('defaults to the shared .prose class used by globals.css', () => {
    const html = renderToStaticMarkup(<Prose text="Some text." />);

    expect(html).toContain('class="prose"');
  });

  it('accepts a custom className', () => {
    const html = renderToStaticMarkup(<Prose text="Some text." className="prose custom" />);

    expect(html).toContain('class="prose custom"');
  });
});
