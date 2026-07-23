import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Link from 'next/link';
import { BrowseMenu } from '@/components/browse-menu';

/**
 * Browse menu — desktop hover-open (Sprint 46, Workstream B).
 *
 * The hover behaviour lives entirely in effects + pointer handlers, which React's SSR
 * never runs and this project's node (not jsdom) test env cannot dispatch — so a static
 * render IS the no-JS / pre-hydration view, which is the state with the real failure mode:
 * if hover-open ever regressed the SERVER markup, a no-JS visitor would lose click-to-open.
 * The behaviour that can only exist at runtime is pinned by asserting against the source,
 * the same tool filter-disclosure.test.tsx uses for its guard effect.
 */
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/',
}));

function render(hoverEnabled: boolean) {
  return renderToStaticMarkup(
    <BrowseMenu
      label="Browse"
      className="relative"
      summaryClassName="browse-summary"
      panelClassName="browse-panel"
      hoverEnabled={hoverEnabled}
    >
      <Link href="/?category=furniture">Furniture</Link>
    </BrowseMenu>,
  );
}

describe('BrowseMenu — server render (no JS yet)', () => {
  it('is a native <details> with its summary and the server-rendered links', () => {
    const html = render(true);
    expect(html).toMatch(/<details[^>]*class="relative"/);
    expect(html).toMatch(/<summary[^>]*>Browse/);
    // The category links are server-rendered and passed straight through — no-JS reaches them.
    expect(html).toContain('href="/?category=furniture"');
    // Closed by default; the trigger is right there to open it without JS.
    expect(html).not.toContain('open=""');
  });

  it('renders IDENTICALLY with and without hoverEnabled — hover is a JS-only enhancement', () => {
    // Progressive enhancement: the desktop hover path must add nothing to the SSR markup,
    // so the mobile drawer copy (hoverEnabled off) and the no-JS desktop view are the same.
    expect(render(true)).toBe(render(false));
  });
});

describe('BrowseMenu — the hover path is desktop-pointer-gated (source)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/browse-menu.tsx'),
    'utf8',
  );

  it('only hovers on a desktop pointer device (matches the lg nav breakpoint)', () => {
    expect(source).toContain("'(hover: hover) and (min-width: 64rem)'");
    expect(source).toContain('window.matchMedia(DESKTOP_HOVER_QUERY)');
  });

  it('attaches pointer handlers ONLY when hover is active, so touch/mobile stays tap', () => {
    expect(source).toContain('hoverActive');
    expect(source).toMatch(/onPointerEnter: openNow, onPointerLeave: scheduleClose/);
  });

  it('closes on pointer-leave after a grace delay, cancelled when the panel is reached', () => {
    expect(source).toContain('CLOSE_GRACE_MS');
    expect(source).toMatch(/setTimeout\(\(\) => setOpen\(false\), CLOSE_GRACE_MS\)/);
    // The panel cancels the pending close so the summary→panel gap doesn't flicker it shut.
    expect(source).toContain('onPointerEnter={hoverActive ? clearCloseTimer : undefined}');
  });

  it('keeps click + keyboard working: native toggle stays, and Esc dismisses', () => {
    // The native <details> onToggle is untouched (click/keyboard activation still toggles,
    // and <summary> reflects aria-expanded from `open`).
    expect(source).toContain('onToggle={(event) => setOpen(event.currentTarget.open)}');
    expect(source).toMatch(/event\.key === 'Escape'/);
    expect(source).toContain('summaryRef.current?.focus()');
  });

  it('does not leak the close timer past unmount', () => {
    expect(source).toContain('useEffect(() => clearCloseTimer, []);');
  });
});

describe('site-header wiring — desktop hovers, mobile drawer does not', () => {
  const header = readFileSync(join(process.cwd(), 'src/components/site-header.tsx'), 'utf8');

  it('passes hoverEnabled to the desktop Browse menu', () => {
    const desktop = header.slice(
      header.indexOf('label="Browse"'),
      header.indexOf('</BrowseMenu>', header.indexOf('label="Browse"')),
    );
    expect(desktop).toContain('hoverEnabled');
  });

  it('does NOT pass hoverEnabled to the mobile "Browse by category" drawer menu', () => {
    const mobileStart = header.indexOf('label="Browse by category"');
    const mobile = header.slice(
      mobileStart,
      header.indexOf('</BrowseMenu>', mobileStart),
    );
    expect(mobile).not.toContain('hoverEnabled');
  });
});
