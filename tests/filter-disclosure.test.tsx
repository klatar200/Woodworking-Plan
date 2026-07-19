import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilterDisclosure } from '@/components/filter-disclosure';

/**
 * FilterDisclosure's desktop force-open and its drawer scrim both live in effects,
 * which React's SSR never runs — so a static render IS what a no-JS visitor, a crawler,
 * and the instant before hydration actually see. That is the state worth testing,
 * because it is the one with a real failure mode: if the <summary> were ever dropped
 * (e.g. "the effect opens it anyway, hide the toggle on desktop"), a visitor without JS
 * would be left with a closed panel and no way to open it — the filters would be
 * silently gone. Same argument, same tool, as step-walker.test.tsx; this project runs
 * vitest in `node`, not jsdom.
 */
function render(count: number) {
  return renderToStaticMarkup(
    <FilterDisclosure count={count}>
      <form className="filters-form" />
    </FilterDisclosure>,
  );
}

describe('FilterDisclosure — server render (no JS yet)', () => {
  it('always renders the summary, so the filters are reachable without JS', () => {
    const html = render(0);

    // Sprint 30b: summary styling is Tailwind utilities; assert it is rendered with
    // its label, not on the specific class. QOL-A added a decorative <svg> funnel
    // before the label, so this is a contains-check rather than an exact match.
    expect(html).toMatch(/<summary[^>]*>/);
    expect(html).toContain('Filters');
    // Closed, not hidden: the panel is collapsed but its toggle is right there.
    expect(html).not.toContain('open=""');
  });

  /**
   * QOL-A changed this deliberately (see the component's file doc). Sprint 5 opened the
   * panel whenever filters were active; as a DRAWER that would park a full-height
   * overlay on top of the results on the very tap that asked for them — every Apply
   * would bounce you back to a covered catalog. The count still rides in the trigger,
   * and FilterChips lists the active filters above the results.
   */
  it('stays closed even with active filters, but says how many there are', () => {
    const html = render(3);

    expect(html).not.toContain('open=""');
    expect(html).toContain('Filters (3)');
  });

  it('renders its children inside the disclosure', () => {
    expect(render(0)).toContain('<form class="filters-form">');
  });

  /**
   * QOL-A. The print stylesheet hides the filter panel by class
   * (`.filters { display: none !important }`). Sprint 30b moved this chrome to
   * utilities and dropped the class, orphaning that rule — a printed catalog page
   * would have carried the entire filter form. Standing rule: any class named in an
   * `@media print` block stays on its element.
   */
  it('keeps the `filters` class the print stylesheet hides by name', () => {
    expect(render(0)).toMatch(/<details[^>]*class="[^"]*\bfilters\b/);
  });

  /**
   * The drawer is mobile-only. `lg:static` (plus the matching resets) is what puts the
   * panel back into normal flow inside the Sprint 18 desktop rail — lose it and the
   * filter rail becomes a fixed overlay on desktop, which is the loudest possible
   * regression of "desktop stays exactly as-is".
   */
  it('is an off-canvas drawer below lg and inline flow at lg', () => {
    const html = render(0);

    expect(html).toContain('fixed');
    expect(html).toContain('lg:static');
    expect(html).toContain('lg:overflow-y-visible');
    expect(html).toContain('lg:shadow-none');
    expect(html).toContain('lg:border-l-0');
  });

  /**
   * The scrim and the ✕ only do something with JS. Painting a scrim over a no-JS page
   * would cover the very trigger used to close the drawer — a dead overlay is worse
   * than no overlay — so neither may appear in the server render.
   */
  it('renders no scrim and no close button before hydration', () => {
    const html = render(3);

    expect(html).not.toContain('aria-label="Close filters"');
    expect(html).not.toContain('rgba(0,0,0,0.45)');
  });

  /** The mobile trigger is a compact pill; desktop restores the 44px bar. */
  it('shrinks the trigger on mobile only', () => {
    const html = render(0);

    expect(html).toContain('min-h-[2.25rem]');
    expect(html).toContain('lg:min-h-[2.75rem]');
    expect(html).toContain('lg:px-[1rem]');
  });
});
