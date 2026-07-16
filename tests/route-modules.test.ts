import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Route-module existence guard (2026-07-16).
 *
 * The 2026-07-16 audit found that `/plans/[slug]/build` was pointed at from four
 * places — the "Start building" CTA, the plan page, the service-worker save
 * pre-cache, and the offline library download — while the page module itself was
 * never committed. Every JS user hit a 404 on the core step-by-step content, and
 * 547 green tests never noticed because nothing asserted the *route file* existed
 * (StepWalker was imported only by tests).
 *
 * This test closes that gap structurally: any App Router page that something else
 * links to must exist on disk. A pointer-without-a-page fails here, in CI, instead
 * of as a live 404. When you add a new linked route, add it to ROUTE_MODULES.
 */

const APP = resolve(process.cwd(), 'src/app');

const ROUTE_MODULES = [
  'page.tsx', // home / catalog
  'plans/[slug]/page.tsx', // plan detail
  'plans/[slug]/build/page.tsx', // "Start building" — the one that shipped as a pointer with no page
  'plans/[slug]/print/page.tsx', // print sheet
  'plans/[slug]/boards/page.tsx', // board optimizer
  'saved/page.tsx',
  'shopping-list/page.tsx',
  'workshop/page.tsx',
  'builds/page.tsx',
  'paths/page.tsx',
  'paths/[slug]/page.tsx',
  'profile/page.tsx',
  'about/page.tsx',
  'faq/page.tsx',
];

describe('App Router route modules exist on disk', () => {
  for (const rel of ROUTE_MODULES) {
    it(`${rel} exists`, () => {
      expect(existsSync(resolve(APP, rel)), `${rel} is missing — a linked route with no page module ships a 404`).toBe(true);
    });
  }
});
