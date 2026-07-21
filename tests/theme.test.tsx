import { readFileSync } from 'fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { THEME_INIT_SCRIPT, THEME_CHROME_COLOR, themeCookie } from '@/lib/theme';

/**
 * Sprint 37 (audit D1) — dark mode for everyone.
 *
 * Three things are guarded here, in descending order of "this would be invisible if it
 * broke": the OS-preference init script's LOGIC (executed, not string-matched), the
 * toggle's no-JS contract, and its reachability from public chrome.
 */

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * Run THEME_INIT_SCRIPT against a fake document, the same technique tests/offline.test.ts
 * uses for sw-policy.js: test the exact code the browser runs, not a mirror of it.
 */
function runInitScript({
  cookie,
  prefersDark,
  matchMediaAvailable = true,
  alreadyDark = false,
}: {
  cookie: string;
  prefersDark: boolean;
  matchMediaAvailable?: boolean;
  alreadyDark?: boolean;
}): string[] {
  const classes: string[] = alreadyDark ? ['dark'] : [];
  const sandbox = {
    document: {
      cookie,
      documentElement: {
        classList: {
          add: (name: string) => {
            if (!classes.includes(name)) classes.push(name);
          },
        },
      },
    },
    ...(matchMediaAvailable
      ? { matchMedia: (query: string) => ({ matches: prefersDark && query.includes('dark') }) }
      : {}),
  };
  runInNewContext(THEME_INIT_SCRIPT, sandbox);
  return classes;
}

describe('the OS-preference init script (Keagan, DECISIONS_LOG.md 2026-07-21)', () => {
  it('goes dark when there is no cookie and the OS asks for dark', () => {
    expect(runInitScript({ cookie: '', prefersDark: true })).toContain('dark');
  });

  it('stays light when there is no cookie and the OS asks for light', () => {
    expect(runInitScript({ cookie: '', prefersDark: false })).not.toContain('dark');
  });

  /**
   * THE CASE A NAIVE prefers-color-scheme IMPLEMENTATION GETS WRONG. Someone on an
   * OS-dark machine who explicitly chose LIGHT must stay light. The cookie is the pin.
   */
  it('respects an explicit LIGHT choice on an OS-dark machine', () => {
    expect(
      runInitScript({ cookie: 'theme=light', prefersDark: true }),
    ).not.toContain('dark');
  });

  it('no-ops when the cookie is dark (the server already stamped the class)', () => {
    const classes = runInitScript({
      cookie: 'theme=dark',
      prefersDark: true,
      alreadyDark: true,
    });
    expect(classes).toEqual(['dark']);
  });

  /**
   * 🛑 THE ESCAPING REGRESSION TEST. `\s` inside a JS string is an unrecognised escape
   * that collapses to a bare `s`, shipping `/(?:^|;s*)theme=/` — which matches only when
   * `theme` is the FIRST cookie. With any other cookie in front (Clerk sets several), an
   * explicit choice would be ignored and the OS would silently win. `theme.ts` writes
   * `\\s` for exactly this reason; this asserts the emitted regex actually works.
   */
  it('finds the theme cookie when it is NOT first in the list', () => {
    expect(
      runInitScript({ cookie: '__session=abc; theme=light', prefersDark: true }),
    ).not.toContain('dark');
  });

  it('is not fooled by a cookie whose name merely ENDS in "theme"', () => {
    // `mytheme=light` is not a choice about our theme — the OS preference still applies.
    expect(runInitScript({ cookie: 'mytheme=light', prefersDark: true })).toContain('dark');
  });

  /**
   * This is the first thing that runs on every page. A throw here happens BEFORE the body
   * renders — it must degrade to the light default, never take the page with it.
   */
  it('survives a browser with no matchMedia instead of killing the page', () => {
    expect(() =>
      runInitScript({ cookie: '', prefersDark: true, matchMediaAvailable: false }),
    ).not.toThrow();
  });

  it('reads only the theme cookie and writes nothing', () => {
    expect(THEME_INIT_SCRIPT).not.toMatch(/document\.cookie\s*=/);
    expect(THEME_INIT_SCRIPT).not.toMatch(/localStorage|fetch|XMLHttpRequest/);
  });
});

describe('the theme cookie', () => {
  it('pins the choice for a year, scoped site-wide, SameSite=Lax', () => {
    expect(themeCookie('dark')).toBe(
      'theme=dark; path=/; max-age=31536000; SameSite=Lax',
    );
    expect(themeCookie('light')).toContain('theme=light');
  });
});

describe('browser chrome follows the theme (37.3)', () => {
  /** The meta colour is each theme's own --bg, so the OS toolbar continues the page. */
  it('uses the real --bg token of each theme', () => {
    const css = source('src/app/globals.css');
    const bgIn = (selector: RegExp) => {
      const start = css.search(selector);
      const open = css.indexOf('{', start);
      const body = css.slice(open + 1, css.indexOf('}', open));
      return /--bg:\s*(#[0-9a-fA-F]{3,8})/.exec(body)?.[1]?.toLowerCase();
    };
    expect(THEME_CHROME_COLOR.light).toBe(bgIn(/^:root\s*\{/m));
    expect(THEME_CHROME_COLOR.dark).toBe(bgIn(/^\.dark\s*\{/m));
  });

  it('is rendered per request, not as a fixed value', () => {
    const layout = source('src/app/layout.tsx');
    expect(layout).toContain('generateViewport');
    // The pre-Sprint-37 constant: a dark toolbar over the light default theme.
    expect(layout).not.toContain("themeColor: '#1a1a1a'");
  });

  it('carries the CSP nonce on the init script (strict-dynamic blocks it otherwise)', () => {
    const layout = source('src/app/layout.tsx');
    expect(layout).toMatch(/<script\s+nonce=\{nonce\}/);
    expect(layout).toContain('THEME_INIT_SCRIPT');
    expect(layout).toContain("headers()).get('x-nonce')");
  });
});

describe('the toggle is a JS-only enhancement, never a dead control', () => {
  it('renders nothing on the server (no-JS visitors see no button)', () => {
    expect(renderToStaticMarkup(<ThemeToggle className="x" />)).toBe('');
  });
});

/**
 * 37.4 — THE ACCEPTANCE TEST FOR D1's CORE COMPLAINT: a signed-out visitor could not
 * reach dark mode at all. These assert the toggle sits in PUBLIC chrome, i.e. outside the
 * `<SignedIn>` gate that hid it. Source-level, because the component renders nothing
 * server-side (above) — so there is no markup to inspect.
 */
describe('dark mode is reachable while signed out (37.4)', () => {
  const header = source('src/components/site-header.tsx');
  const footer = source('src/components/site-footer.tsx');

  it('renders in the mobile drawer and in the footer', () => {
    expect(header).toContain('<ThemeToggle');
    expect(footer).toContain('<ThemeToggle');
  });

  it('is NOT inside a <SignedIn> or <SignedOut> gate in the header', () => {
    const gated = header.match(/<Signed(?:In|Out)>[\s\S]*?<\/Signed(?:In|Out)>/g) ?? [];
    expect(gated.length).toBeGreaterThan(0); // the gates exist — we're testing placement
    for (const block of gated) expect(block).not.toContain('ThemeToggle');
  });

  it('meets the 44px rule at every call site (Sprint 34)', () => {
    // Drawer uses `drawerLink`; the footer has its own 44px button class because
    // `footerLink` is 2.25rem and two min-h utilities would fight in source order.
    expect(header).toMatch(/const drawerLink\s*=[\s\S]*?min-h-\[2\.75rem\]/);
    expect(footer).toMatch(/const footerButton\s*=[\s\S]*?min-h-\[2\.75rem\]/);
    expect(footer).toMatch(/<ThemeToggle className=\{footerButton\}/);
  });
});

/**
 * BOTH HALVES, the standing convention: an exemption is only real if the attribute it
 * keys on is actually emitted. The drawer closes on any click inside it, so without this
 * pairing, toggling the theme would slam the drawer shut.
 */
describe('toggling the theme does not close the mobile drawer', () => {
  it('emits data-theme-toggle, and the drawer exempts it', () => {
    expect(source('src/components/theme-toggle.tsx')).toContain('data-theme-toggle');
    expect(source('src/components/mobile-nav.tsx')).toContain('[data-theme-toggle]');
  });
});

/**
 * 37.2 — one appearance source. A per-page `appearance` prop overrides the provider, which
 * is how an auth page ends up white inside a dark app.
 */
describe('Clerk theming has exactly one source', () => {
  it('is set on ClerkProvider from the current theme', () => {
    expect(source('src/app/layout.tsx')).toMatch(
      /appearance=\{isDark \? clerkAppearanceDark : clerkAppearance\}/,
    );
  });

  it('is not re-passed on the sign-in or sign-up pages', () => {
    for (const path of [
      'src/app/sign-in/[[...sign-in]]/page.tsx',
      'src/app/sign-up/[[...sign-up]]/page.tsx',
    ]) {
      expect(source(path), path).not.toContain('appearance=');
    }
  });
});
