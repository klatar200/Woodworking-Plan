import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { optimize, totalBoards, DEFAULT_OPTIONS, type Part } from '@/lib/cut-optimizer';
import { InlineBoardPlan } from '@/components/inline-board-plan';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

/**
 * QOL-B item 4 — the cut list's to-scale visual, embedded in the Cut List tab.
 *
 * The thing that must never be true here is a SECOND IMPLEMENTATION of the optimizer.
 * Sprint 15's five rules (kerf, ripping, physicalBoards-vs-lanes, impossible parts,
 * no grain rotation) are all in `cut-optimizer.ts`; a component that recomputed any of
 * them would drift from `/boards` and put someone at a lumberyard with the wrong number.
 * So these tests compare what is RENDERED against what the shared functions RETURN,
 * rather than against a hand-written expectation.
 */

type Row = {
  id: string;
  part: string;
  quantity: number;
  thicknessIn: number;
  widthIn: number;
  lengthIn: number;
  material: string | null;
};

const cutList: Row[] = [
  {
    id: 'c1',
    part: 'Leg',
    quantity: 4,
    thicknessIn: 1.5,
    widthIn: 3.5,
    lengthIn: 29,
    material: 'Maple',
  },
  {
    id: 'c2',
    part: 'Rail',
    quantity: 2,
    thicknessIn: 0.75,
    widthIn: 5.5,
    lengthIn: 40,
    material: 'Maple',
  },
];

const toParts = (rows: Row[]): Part[] =>
  rows.map((r) => ({
    id: r.id,
    label: r.part,
    quantity: r.quantity,
    thicknessIn: r.thicknessIn,
    widthIn: r.widthIn,
    lengthIn: r.lengthIn,
    material: r.material,
  }));

const render = (rows: Row[]) =>
  renderToStaticMarkup(<InlineBoardPlan slug="oak-bench" cutList={rows} />);

describe('InlineBoardPlan uses the SHARED optimizer, not its own math', () => {
  it('renders exactly the board count totalBoards() returns', () => {
    const expected = totalBoards(optimize(toParts(cutList), DEFAULT_OPTIONS));

    expect(expected).toBeGreaterThan(0);
    expect(render(cutList)).toContain(`<strong>${expected}</strong>`);
  });

  it('draws a to-scale bar per board (the same component /boards uses)', () => {
    const html = render(cutList);

    expect(html).toContain('class="board-bar"');
    expect(html).toContain('board-piece');
    // The bar is an image with a text alternative, not a decorative div.
    expect(html).toContain('role="img"');
  });

  it('states the assumptions and links out for a different shop', () => {
    const html = render(cutList);

    // DEFAULT_OPTIONS, said out loud — a board count with unstated assumptions is a
    // number someone will act on at a lumberyard.
    expect(html).toContain(`${DEFAULT_OPTIONS.stockLengthIn / 12} ft`);
    expect(html).toContain('/plans/oak-bench/boards');
  });
});

describe('IMPOSSIBLE PARTS: optimizer rule 4 — never a confident wrong answer', () => {
  const tooLong: Row[] = [
    {
      id: 'c9',
      part: 'Stretcher',
      quantity: 1,
      thicknessIn: 0.75,
      widthIn: 3.5,
      // Longer than every stock length the default offers.
      lengthIn: 400,
      material: null,
    },
  ];

  it('withholds the board count and sends the reader to the full board plan', () => {
    const html = render(tooLong);

    // "Buy 0 boards" next to a part that does not fit is exactly the confident-but-wrong
    // buying list Sprint 15 forbade.
    expect(html).not.toContain('board-total');
    expect(html).toContain('notice-warning');
    expect(html).toContain('/plans/oak-bench/boards');
  });
});
