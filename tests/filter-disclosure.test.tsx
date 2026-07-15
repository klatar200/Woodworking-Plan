import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterDisclosure } from '@/components/filter-disclosure';

/**
 * FilterDisclosure's desktop force-open lives in a `useEffect`, which React's
 * SSR never runs — so a static render IS what a no-JS visitor, a crawler, and
 * the instant before hydration actually see. That is the state worth testing,
 * because it is the one with a real failure mode: if the <summary> were ever
 * dropped (e.g. "the effect opens it anyway, hide the toggle on desktop"), a
 * visitor without JS would be left with a closed panel and no way to open it —
 * the filters would be silently gone. Same argument, same tool, as
 * step-walker.test.tsx; this project runs vitest in `node`, not jsdom.
 */
describe('FilterDisclosure — server render (no JS yet)', () => {
  it('always renders the summary, so the filters are reachable without JS', () => {
    const html = renderToStaticMarkup(
      <FilterDisclosure count={0}>
        <form />
      </FilterDisclosure>,
    );

    // Sprint 30b: summary styling is now Tailwind utilities; assert it's rendered
    // with its label, not on the specific class.
    expect(html).toMatch(/<summary[^>]*>Filters<\/summary>/);
    // Closed, not hidden: the panel is collapsed but its toggle is right there.
    expect(html).not.toContain('open=""');
  });

  it('starts OPEN when filters are already active, at any width', () => {
    const html = renderToStaticMarkup(
      <FilterDisclosure count={3}>
        <form />
      </FilterDisclosure>,
    );

    expect(html).toContain('open=""');
    // The badge tells you how many are on before you open it.
    expect(html).toContain('Filters (3)');
  });

  it('renders its children inside the disclosure', () => {
    const html = renderToStaticMarkup(
      <FilterDisclosure count={0}>
        <form className="filters-form" />
      </FilterDisclosure>,
    );

    expect(html).toContain('<form class="filters-form">');
  });
});
