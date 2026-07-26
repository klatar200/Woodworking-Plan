import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OptimizerPanel } from '@/components/designer/optimizer-panel';
import { formatBoardFeet } from '@/lib/format';
import { yieldRatio, optimize, DEFAULT_OPTIONS, type Part } from '@/lib/cut-optimizer';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

describe('formatBoardFeet — volume quantity (Sprint 64 fix)', () => {
  it('matches the designer: two decimals below 10, one at/above', () => {
    expect(formatBoardFeet(1.3880859374999999)).toBe('1.39');
    expect(formatBoardFeet(12.345)).toBe('12.3');
    expect(formatBoardFeet(Number.NaN)).toBe('0');
  });
});

describe('shopping-list quantity render — no raw floats', () => {
  it('rendered board-feet quantities never show 3+ decimal places', async () => {
    // Source-level: formatQuantity must use formatBoardFeet for board-feet units.
    const page = readFileSync('src/app/shopping-list/page.tsx', 'utf8');
    expect(page).toMatch(/formatBoardFeet/);
    expect(page).toMatch(/isBoardFeetUnit/);
    expect(page).toMatch(/formatQuantity/);

    // Render seam: a float that would print as 1.388… must become 1.39.
    const raw = 1.3880859374999999;
    const rendered = `${formatBoardFeet(raw)} board feet`;
    expect(rendered).toBe('1.39 board feet');
    expect(rendered).not.toMatch(/\d\.\d{3,}/);
    // Guard: raw interpolation would fail this.
    expect(`${raw} board feet`).toMatch(/\d\.\d{3,}/);
  });

  it('source summary does not call a board design a plan', () => {
    const page = readFileSync('src/app/shopping-list/page.tsx', 'utf8');
    expect(page).toMatch(/sourceSummary/);
    expect(page).toMatch(/On this list/);
    expect(page).not.toMatch(/Plans on this list/);
  });

  it('merged footer is source-neutral (designs are not plans)', () => {
    const page = readFileSync('src/app/shopping-list/page.tsx', 'utf8');
    expect(page).toMatch(/Quantities are summed across everything on this list/);
    expect(page).not.toMatch(/Quantities are summed across plans/);
  });
});

describe('yield label — consumed, not used (Sprint 64 fix)', () => {
  it('keeps kerf + end trim in the numerator and labels as consumed', () => {
    // One 77.25″ part on 96″ stock: parts alone ≈ 80%; usedIn includes kerf + 1″ trim → ~82%.
    const parts: Part[] = [
      {
        id: 'p',
        label: 'Strip',
        quantity: 1,
        thicknessIn: 1.5,
        widthIn: 1.5,
        lengthIn: 77.25,
        material: 'Hard Maple',
      },
    ];
    const groups = optimize(parts, { ...DEFAULT_OPTIONS, wasteFactor: 0 });
    const ratio = yieldRatio(groups[0]!, 96);
    const pct = Math.round(ratio * 100);
    expect(pct).toBeGreaterThan(80); // kerf + trim above bare part length
    expect(pct).toBeLessThan(85);

    const panel = readFileSync('src/components/designer/optimizer-panel.tsx', 'utf8');
    expect(panel).toMatch(/% of each board consumed/);
    expect(panel).not.toMatch(/of the boards you buy used/);
    // Decision pinned: relabel, do not drop kerf/trim from numerator.
    expect(panel).toMatch(/kerf \+ end trim/);
  });

  it('impossible-parts copy uses an/a and ASCII inch marks', () => {
    const html = renderToStaticMarkup(
      createElement(OptimizerPanel, {
        config: makeV2Config({
          grain: 'edge',
          sourceLengthIn: 100,
          panels: [
            makePanel('p1', 'P', 1.5, [makeStrip('s1', 'hard-maple', 1.5, 1)]),
          ],
        }),
      }),
    );
    expect(html).toMatch(/do not fit on an 8 ft board/);
    expect(html).not.toMatch(/on a 8 ft board/);
    expect(html).toMatch(/96"/);
    expect(html).not.toMatch(/96″/);
  });
});
