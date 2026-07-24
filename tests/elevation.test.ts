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
  // Sprint 49: Browse mega-menu deleted — no floating panel in the header.
  ['../src/components/overflow-menu.tsx', '“…” overflow menu', 'e2'],
  ['../src/components/mobile-nav.tsx', 'mobile drawer sheet', 'e3'],
  // Sprint 47: account modal deleted — settings panes use shadow-e1 cards instead.
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
 * Sprint 41.4 (audit H4) / Sprint 47 — ONE workshop picker, now at /settings/workshop.
 *
 * The account modal (retired Sprint 47) held a full second implementation. Asserting
 * ABSENCE of that plumbing and of the modal file itself is the point.
 */
describe('the account modal is retired; one workshop picker remains (41.4 / 47)', () => {
  it('account-modal.tsx is deleted', () => {
    expect(() => read('../src/components/account-modal.tsx')).toThrow();
  });

  it('the plan page and settings rail point at /settings/workshop', () => {
    const plan = read('../src/app/plans/[slug]/page.tsx');
    expect(plan).toContain('/settings/workshop');
    expect(plan).not.toContain('/profile#workshop');
  });

  it('the /api/workshop route and the modal action are deleted, not just unused', () => {
    expect(() => read('../src/app/api/workshop/route.ts')).toThrow();

    const action = read('../src/app/actions/workshop.ts');
    expect(action).not.toMatch(/^export (async function|type) .*WorkshopSaveResult/m);
    expect(action).not.toMatch(/^export async function saveWorkshopModalAction/m);
    expect(action).toMatch(/^export async function saveWorkshopAction/m);
  });
});
