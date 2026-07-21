import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/**
 * Sprint 41.1 (audit V1) — the floating layer uses the elevation SCALE, not five
 * hand-rolled shadows.
 *
 * QOL-F built `--elev-1/2/3` in both themes, and then every popover, drawer and modal
 * added after it kept writing its own `shadow-[0_8px_24px_rgba(0,0,0,0.14)]`. Two
 * consequences, neither visible in a light-mode screenshot:
 *
 *   1. Those literals are flat black at low alpha. On the dark theme's near-black
 *      surfaces they are invisible, and they carry none of the inset top-edge
 *      light-catch the dark tokens use to signal elevation — so in dark mode five
 *      floating surfaces read as flat panels.
 *   2. The print block sets `--elev-*: none`. A literal ignores that and prints ink.
 *
 * This is a SOURCE test for the same reason `landing-scale.test.ts` is: rendering proves
 * a panel appears, not that it belongs to a system. The failure being guarded here never
 * breaks anything — it silently re-forks the scale one popover at a time.
 */
function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

/** file → the elevation step that surface is supposed to sit at. */
const FLOATING: Array<[string, string, 'e2' | 'e3']> = [
  ['../src/components/site-header.tsx', 'Browse menu panel', 'e2'],
  ['../src/components/overflow-menu.tsx', '“…” overflow menu', 'e2'],
  ['../src/components/mobile-nav.tsx', 'mobile drawer sheet', 'e3'],
  ['../src/components/account-modal.tsx', 'account modal', 'e3'],
  ['../src/components/filter-disclosure.tsx', 'filter drawer', 'e3'],
];

describe('the floating layer is on the elevation scale (41.1)', () => {
  it.each(FLOATING)('%s (%s) uses shadow-%s', (file, _label, step) => {
    expect(read(file)).toContain(`shadow-${step}`);
  });

  /**
   * The acceptance criterion the sprint actually set. Written as a scan of every
   * component so a NEW popover with a bespoke shadow fails too — the point is not to
   * fix five files, it is to stop the sixth.
   *
   * `drop-shadow-[…]` is a different property (an SVG/image filter, used on the
   * landing's decorative saw) and is not elevation. `::backdrop` scrims are a dimmed
   * page, not a raised surface, and must not follow the theme.
   */
  it('no component ships a hand-rolled box-shadow literal any more', () => {
    const offenders: string[] = [];
    for (const [file] of FLOATING) {
      for (const line of read(file).split('\n')) {
        // `shadow-[` preceded by a word char is `drop-shadow-[` / `inset-shadow-[`.
        if (/(?<![\w-])shadow-\[/.test(line)) offenders.push(`${file}: ${line.trim()}`);
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  /**
   * The drawer is the one substitution that changed the LOOK: its literal cast left
   * (`-8px 0`), matching the edge it slides in from, and `--elev-3` casts down. Accepted
   * (the drawer has a scrim and a `border-l` doing the edge). If it ever reads flat, the
   * fix is a token — `--elev-drawer` in BOTH themes, which `dark-theme.test.ts` enforces
   * — not the literal back. `lg:shadow-none` must survive: on desktop the drawer is an
   * in-flow block inside the rail card, and a floating shadow there is wrong.
   */
  it('the filter drawer still drops its shadow on desktop', () => {
    expect(read('../src/components/filter-disclosure.tsx')).toContain('lg:shadow-none');
  });
});

/**
 * Sprint 41.4 (audit H4, ⚖️ Keagan 2026-07-21) — ONE workshop picker.
 *
 * The modal held a full second implementation: its own fetch, its own owned-tools state,
 * its own save action. Two write paths to the same rows, with copy that had to be
 * maintained in lockstep. It is now a link to `/profile#workshop`, which is the picker.
 *
 * Asserting the ABSENCE is the point — a passing "the link renders" test would still pass
 * with all the plumbing sitting next to it.
 */
describe('the account modal links to the one workshop picker (41.4)', () => {
  const modal = read('../src/components/account-modal.tsx');

  it('links to /profile#workshop and closes the modal on the way', () => {
    expect(modal).toContain('/profile#workshop');
    // Same treatment as the Activity links: navigating away must not leave a modal
    // open behind the new page.
    expect(modal).toMatch(/href="\/profile#workshop"[\s\S]{0,160}onClick=\{onClose\}/);
  });

  it('carries no tool-picker plumbing at all', () => {
    for (const gone of [
      "fetch('/api/workshop')",
      'saveWorkshopModalAction',
      'WorkshopSaveResult',
      'checkboxInput',
      'toggleTool',
    ]) {
      // The file's doc comment explains what was removed and names two of these, so
      // match them as CODE (an identifier in a statement), not as prose.
      const asCode = new RegExp(`^(?!\\s*\\*).*${gone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
      expect(asCode.test(modal), `${gone} still present as code`).toBe(false);
    }
  });

  /**
   * The endpoint that existed only to feed the duplicate UI is gone. One fewer
   * authenticated route is one fewer thing to get wrong — and this one was never on
   * `PUBLIC_ROUTES` (verified), so nothing about the allowlist changes.
   */
  it('the /api/workshop route and the modal action are deleted, not just unused', () => {
    expect(() => read('../src/app/api/workshop/route.ts')).toThrow();

    const action = read('../src/app/actions/workshop.ts');
    expect(action).not.toMatch(/^export (async function|type) .*WorkshopSaveResult/m);
    expect(action).not.toMatch(/^export async function saveWorkshopModalAction/m);
    // The real form's action is untouched — that is the whole point of choosing (a).
    expect(action).toMatch(/^export async function saveWorkshopAction/m);
  });
});
