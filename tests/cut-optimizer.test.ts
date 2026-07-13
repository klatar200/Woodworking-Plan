import { describe, it, expect } from 'vitest';
import {
  optimize,
  packLengths,
  boardFeetForPart,
  totalBoards,
  hasImpossibleParts,
  yieldRatio,
  DEFAULT_OPTIONS,
  type Part,
} from '@/lib/cut-optimizer';

/**
 * The cut-list optimizer — Sprint 15.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE FAILURE MODE HERE IS PHYSICAL. A wrong shopping list wastes a trip; a wrong
 * BOARD PLAN wastes a board, and finds out at the saw, with the last part ruined.
 *
 * So the tests are weighted toward the four things that make a naive optimizer wrong:
 *
 *   1. KERF. Six 16″ parts do NOT fit on a 96″ board.
 *   2. Impossible parts are reported LOUDLY, never silently dropped.
 *   3. Packing is 1-D along the length — grain does not rotate.
 *   4. Parts are grouped by the stock they are BOUGHT as, not by how similar they look.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const part = (over: Partial<Part> = {}): Part => ({
  id: 'p1',
  label: 'Part',
  quantity: 1,
  thicknessIn: 0.75,
  widthIn: 3.5,
  lengthIn: 24,
  material: 'Cedar',
  ...over,
});

const NO_WASTE = { ...DEFAULT_OPTIONS, wasteFactor: 0 };

describe('KERF — the thing that makes hand-calculated cut lists wrong', () => {
  it('six 16″ parts do NOT fit on a 96″ board, because the blade eats 1/8″ a cut', () => {
    // 6 × 16 = 96 exactly. Naive arithmetic says one board. Reality says you are short.
    const pieces = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      label: 'Strip',
      lengthIn: 16,
    }));

    const { boards } = packLengths(pieces, {
      stockLengthIn: 96,
      kerfIn: 0.125,
      endTrimIn: 1,
    });

    // Squaring the end costs 1″, and each cut costs 1/8″. There is not room for six.
    // Getting this wrong means standing at a saw with a ruined final piece.
    expect(boards).toHaveLength(2);
    expect(boards[0]!.parts).toHaveLength(5);
    expect(boards[1]!.parts).toHaveLength(1);
  });

  it('a wider kerf costs you more board', () => {
    // 10 × 9.4″ = 94″. Usable is 95″, so the parts themselves fit with room to spare —
    // and whether they ACTUALLY fit is decided entirely by the kerf:
    //   1/16″ blade → 10 × 9.4625 = 94.625 ≤ 95   ✓ one board
    //   1/2″  blade → 10 × 9.9    = 99     > 95   ✗ two boards
    const pieces = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      label: 'Strip',
      lengthIn: 9.4,
    }));

    const thin = packLengths(pieces, { stockLengthIn: 96, kerfIn: 0.0625, endTrimIn: 1 });
    const fat = packLengths(pieces, { stockLengthIn: 96, kerfIn: 0.5, endTrimIn: 1 });

    expect(thin.boards).toHaveLength(1);
    // Proves the kerf is actually IN THE ARITHMETIC rather than decorating the comments.
    expect(fat.boards.length).toBeGreaterThan(thin.boards.length);
  });

  it('the END TRIM is charged too — board ends are checked and out of square', () => {
    const pieces = [{ id: 'a', label: 'Long', lengthIn: 95.5 }];

    // 95.5 + 0.125 kerf = 95.625, which fits in 96 — but NOT after squaring 1″ off the
    // end. Every woodworker squares the end; the optimizer must assume it too.
    const { boards, impossible } = packLengths(pieces, {
      stockLengthIn: 96,
      kerfIn: 0.125,
      endTrimIn: 1,
    });

    expect(boards).toHaveLength(0);
    expect(impossible).toHaveLength(1);
  });
});

describe('IMPOSSIBLE PARTS are reported, never silently dropped', () => {
  it('a part longer than the stock is flagged with a reason', () => {
    const groups = optimize(
      [part({ id: 'beam', label: 'Long beam', lengthIn: 120 })],
      { ...NO_WASTE, stockLengthIn: 96 },
    );

    // Silently omitting it would hand the user a confident buying list that cannot
    // build the thing. That is worse than no tool at all.
    expect(groups[0]!.impossible).toHaveLength(1);
    expect(groups[0]!.impossible[0]!.label).toBe('Long beam');
    expect(groups[0]!.impossible[0]!.reason).toMatch(/longer than/i);
    expect(groups[0]!.boards).toHaveLength(0);

    expect(hasImpossibleParts(groups)).toBe(true);
  });

  it('the same part becomes possible on longer stock', () => {
    const longBeam = [part({ id: 'beam', lengthIn: 120 })];

    expect(hasImpossibleParts(optimize(longBeam, { ...NO_WASTE, stockLengthIn: 96 }))).toBe(
      true,
    );
    // A 12-foot board. Now it fits, and the tool should say so rather than shrug.
    expect(
      hasImpossibleParts(optimize(longBeam, { ...NO_WASTE, stockLengthIn: 144 })),
    ).toBe(false);
  });

  it('one impossible part does not stop the rest being packed', () => {
    const groups = optimize(
      [
        part({ id: 'ok', label: 'Fits', lengthIn: 20, thicknessIn: 0.75, widthIn: 3.5 }),
        part({ id: 'no', label: 'Too long', lengthIn: 200, thicknessIn: 0.75, widthIn: 3.5 }),
      ],
      { ...NO_WASTE, stockLengthIn: 96 },
    );

    // The user still gets a plan for what they CAN cut, plus a loud warning.
    expect(groups[0]!.boards).toHaveLength(1);
    expect(groups[0]!.impossible).toHaveLength(1);
  });
});

describe('GROUPING: by the stock you BUY, not by what looks similar', () => {
  it('splits 0.75×3.5 from 1.5×3.5 — a 1x4 is not a 2x4', () => {
    const groups = optimize(
      [
        part({ id: 'a', thicknessIn: 0.75, widthIn: 3.5 }),
        part({ id: 'b', thicknessIn: 1.5, widthIn: 3.5 }),
      ],
      NO_WASTE,
    );

    // Same width, and they'd sit next to each other in a cut-list table. They do not
    // come off the same board, and a plan that says otherwise cannot be bought.
    expect(groups).toHaveLength(2);
  });

  it('splits by width too — a 1x4 is not a 1x6', () => {
    const groups = optimize(
      [
        part({ id: 'a', thicknessIn: 0.75, widthIn: 3.5 }),
        part({ id: 'b', thicknessIn: 0.75, widthIn: 5.5 }),
      ],
      NO_WASTE,
    );

    expect(groups).toHaveLength(2);
  });

  it('keeps identical stock together, so it packs onto shared boards', () => {
    const groups = optimize(
      [
        part({ id: 'a', label: 'Slats', quantity: 3, lengthIn: 18 }),
        part({ id: 'b', label: 'Rails', quantity: 2, lengthIn: 18 }),
      ],
      NO_WASTE,
    );

    expect(groups).toHaveLength(1);

    // 5 pieces × 18.125″ (with kerf) = 90.625″, inside the 95″ usable. They share ONE
    // board. Treating "Slats" and "Rails" as separate purchases would buy two boards
    // for a job that needs one — the single most common way people over-buy lumber.
    expect(totalBoards(groups)).toBe(1);
  });

  it('expands quantity — 6 identical strips are 6 pieces to place, not 1', () => {
    const groups = optimize(
      [part({ id: 'strip', label: 'Strip', quantity: 6, lengthIn: 19 })],
      NO_WASTE,
    );

    const placed = groups[0]!.boards.flatMap((board) => board.parts);
    expect(placed).toHaveLength(6);
  });
});

describe('FIRST-FIT-DECREASING: longest first, or long parts get stranded', () => {
  it('places the longest part first', () => {
    const groups = optimize(
      [
        part({ id: 'short', label: 'Short', lengthIn: 10 }),
        part({ id: 'long', label: 'Long', lengthIn: 60 }),
        part({ id: 'mid', label: 'Mid', lengthIn: 30 }),
      ],
      NO_WASTE,
    );

    // 60 + 30 + 10 = 100″, and only 95″ is usable — so "Short" correctly spills onto a
    // second board. What matters is not WHICH board each part lands on, but that the
    // parts are PLACED in decreasing order: that is the property FFD depends on.
    const placementOrder = groups[0]!.boards.flatMap((board) =>
      board.parts.map((p) => p.lengthIn),
    );

    // Assert the real invariant, not a hand-computed layout I might get wrong.
    const sorted = [...placementOrder].sort((a, b) => b - a);
    expect(placementOrder).toEqual(sorted);

    // And the longest part opens the first board — place the awkward pieces while there
    // is still room for them; short offcuts fill the gaps afterwards.
    expect(groups[0]!.boards[0]!.parts[0]!.label).toBe('Long');
  });

  it('fills a partly-used board before opening a new one', () => {
    const groups = optimize(
      [part({ id: 'p', label: 'Piece', quantity: 4, lengthIn: 40 })],
      NO_WASTE,
    );

    // 95″ usable. Two 40″ pieces fit (80.25″), a third does not. So: 2 boards of 2.
    expect(totalBoards(groups)).toBe(2);
    expect(groups[0]!.boards[0]!.parts).toHaveLength(2);
    expect(groups[0]!.boards[1]!.parts).toHaveLength(2);
  });

  it('is DETERMINISTIC — the same input always gives the same layout', () => {
    // A layout that reshuffles between page loads is one nobody can trust or check
    // against the boards already on their bench.
    const parts = [
      part({ id: 'a', lengthIn: 30 }),
      part({ id: 'b', lengthIn: 30 }),
      part({ id: 'c', lengthIn: 30 }),
    ];

    const first = JSON.stringify(optimize(parts, NO_WASTE));
    const second = JSON.stringify(optimize(parts, NO_WASTE));

    expect(first).toBe(second);
  });
});

describe('board feet', () => {
  it('is thickness × width × length ÷ 144, times quantity', () => {
    // 1 bd ft = 144 cubic inches. A 1″ × 12″ × 12″ board is exactly one.
    expect(boardFeetForPart(part({ thicknessIn: 1, widthIn: 12, lengthIn: 12 }))).toBe(1);
  });

  it('multiplies by quantity', () => {
    expect(
      boardFeetForPart(part({ thicknessIn: 1, widthIn: 12, lengthIn: 12, quantity: 6 })),
    ).toBe(6);
  });

  it('adds the waste allowance — real boards have knots, splits and snipe', () => {
    const groups = optimize(
      [part({ thicknessIn: 1, widthIn: 12, lengthIn: 12 })],
      { ...DEFAULT_OPTIONS, wasteFactor: 0.15 },
    );

    // Buying exactly what the cut list sums to is how you end up back at the lumberyard.
    expect(groups[0]!.boardFeet).toBeCloseTo(1.15, 5);
  });

  it('waste is applied to board FEET, not to the board COUNT', () => {
    const groups = optimize(
      [part({ id: 'p', quantity: 2, lengthIn: 40 })],
      { ...DEFAULT_OPTIONS, wasteFactor: 0.5 },
    );

    // You buy extra board feet to cover defects. You do not buy half an extra board —
    // that is not a thing the lumberyard sells.
    expect(totalBoards(groups)).toBe(1);
    expect(groups[0]!.boardFeet).toBeGreaterThan(0);
  });
});

describe('honesty about waste', () => {
  it('reports the yield, so the user can see what is being thrown away', () => {
    const groups = optimize(
      [part({ id: 'p', label: 'Piece', quantity: 1, lengthIn: 10 })],
      NO_WASTE,
    );

    // One 10″ part on a 96″ board is a ~12% yield. The tool should not hide that —
    // it is the user's cue to pick a shorter board, or find something else to cut.
    const ratio = yieldRatio(groups[0]!, 96);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(0.2);
  });

  it('a well-packed board reports a high yield', () => {
    const groups = optimize(
      [part({ id: 'p', label: 'Piece', quantity: 3, lengthIn: 31 })],
      NO_WASTE,
    );

    expect(yieldRatio(groups[0]!, 96)).toBeGreaterThan(0.95);
  });

  it('an empty group has zero yield rather than dividing by zero', () => {
    const groups = optimize([part({ lengthIn: 500 })], { ...NO_WASTE, stockLengthIn: 96 });

    expect(groups[0]!.boards).toHaveLength(0);
    expect(yieldRatio(groups[0]!, 96)).toBe(0);
  });
});

describe('RIPPING: nobody sells a 2-inch-wide hardwood board', () => {
  /**
   * THIS SUITE EXISTS BECAUSE THE FIRST VERSION OF THE OPTIMIZER WAS WRONG.
   *
   * It grouped parts by width and assumed you could BUY that width. True for cedar 1x4s
   * and 2x4s. False for the maple cutting board, whose strips are 2″ wide — you rip
   * those out of a wider board. The tool would have confidently told someone to buy
   * stock that does not exist.
   */
  it('rips four 2" strips from one 1x10, instead of buying four 2" boards', () => {
    const strips = [
      part({ id: 's', label: 'Board strips', quantity: 6, thicknessIn: 0.8125, widthIn: 2, lengthIn: 19 }),
    ];

    // 9.25" stock. (9.25 + 0.125) / (2 + 0.125) = 4.4 -> 4 rips per board.
    const groups = optimize(strips, { ...NO_WASTE, stockWidthIn: 9.25 });

    expect(groups[0]!.ripsPerBoard).toBe(4);

    // 6 strips at 19" all fit in ONE 95" lane (6 x 19.125 = 114.75 — no, two lanes).
    // Whatever the lane count, the BOARD count must be lanes/rips rounded up, not lanes.
    expect(groups[0]!.physicalBoards).toBe(Math.ceil(groups[0]!.lanes / 4));
    expect(totalBoards(groups)).toBe(groups[0]!.physicalBoards);
  });

  it('the board count is LANES / RIPS — not lanes, which would over-buy 4x', () => {
    const strips = [
      part({ id: 's', label: 'Strips', quantity: 20, thicknessIn: 0.75, widthIn: 2, lengthIn: 40 }),
    ];

    const ripped = optimize(strips, { ...NO_WASTE, stockWidthIn: 9.25 });
    const notRipped = optimize(strips, { ...NO_WASTE, stockWidthIn: null });

    expect(ripped[0]!.ripsPerBoard).toBe(4);

    // Same lanes either way — the lengths do not change. But four lanes come off ONE
    // board when you rip, so the buying list is 4x smaller. Getting this wrong is the
    // difference between buying 10 boards and buying 40.
    expect(ripped[0]!.lanes).toBe(notRipped[0]!.lanes);
    expect(totalBoards(ripped)).toBeLessThan(totalBoards(notRipped));
    expect(totalBoards(ripped)).toBe(Math.ceil(notRipped[0]!.lanes / 4));
  });

  it('charges a kerf for every rip — three 3" strips do NOT fit across a 9.25" board', () => {
    // 3 x 3 = 9, which is under 9.25. But two saw cuts between them eat 1/4", so:
    // (9.25 + 0.125) / (3 + 0.125) = 3.0 exactly -> 3 rips. Tight, and it is right.
    const three = optimize([part({ widthIn: 3, thicknessIn: 0.75 })], {
      ...NO_WASTE,
      stockWidthIn: 9.25,
    });
    expect(three[0]!.ripsPerBoard).toBe(3);

    // Widen the kerf and the third rip no longer fits.
    const fatKerf = optimize([part({ widthIn: 3, thicknessIn: 0.75 })], {
      ...NO_WASTE,
      stockWidthIn: 9.25,
      kerfIn: 0.5,
    });
    expect(fatKerf[0]!.ripsPerBoard).toBe(2);
  });

  it('a part WIDER than the stock is impossible, and says so', () => {
    const groups = optimize(
      [part({ id: 'wide', label: 'Wide panel', widthIn: 11, thicknessIn: 0.75 })],
      { ...NO_WASTE, stockWidthIn: 5.5 },
    );

    // You cannot rip an 11" part from a 5.5" board. Silently omitting it would hand the
    // user a buying list that cannot build the thing.
    expect(groups[0]!.ripsPerBoard).toBe(0);
    expect(groups[0]!.physicalBoards).toBe(0);
    expect(groups[0]!.impossible).toHaveLength(1);
    expect(groups[0]!.impossible[0]!.reason).toMatch(/wider than/i);
    expect(hasImpossibleParts(groups)).toBe(true);
  });

  it('defaults to NO ripping — correct for dimensional lumber', () => {
    // A 3.5" part IS a 1x4. You buy it at that width; you do not rip it. The default
    // must not silently invent a rip strategy for stock that already exists.
    const groups = optimize([part({ widthIn: 3.5, quantity: 2, lengthIn: 30 })], NO_WASTE);

    expect(groups[0]!.ripsPerBoard).toBe(1);
    expect(groups[0]!.physicalBoards).toBe(groups[0]!.lanes);
  });
});

describe('a real plan: the Adirondack chair', () => {
  it('produces a sane board plan from the actual cut list', () => {
    // Straight from content/plans/adirondack-chair.json.
    const parts: Part[] = [
      part({ id: 'rear', label: 'Rear legs', quantity: 2, thicknessIn: 1.5, widthIn: 3.5, lengthIn: 36 }),
      part({ id: 'front', label: 'Front legs', quantity: 2, thicknessIn: 1.5, widthIn: 3.5, lengthIn: 21 }),
      part({ id: 'seat', label: 'Seat slats', quantity: 6, thicknessIn: 0.75, widthIn: 3.5, lengthIn: 22 }),
      part({ id: 'back', label: 'Back slats', quantity: 7, thicknessIn: 0.75, widthIn: 3.5, lengthIn: 32 }),
      part({ id: 'arms', label: 'Arms', quantity: 2, thicknessIn: 0.75, widthIn: 5.5, lengthIn: 28 }),
    ];

    const groups = optimize(parts, DEFAULT_OPTIONS);

    // Three stock profiles: 2x4 (1.5×3.5), 1x4 (0.75×3.5), 1x6 (0.75×5.5).
    expect(groups).toHaveLength(3);

    // Nothing on a chair is longer than an 8-foot board.
    expect(hasImpossibleParts(groups)).toBe(false);

    // The 2x4s go first — thickest stock, and it is what you carry on the bottom.
    expect(groups[0]!.thicknessIn).toBe(1.5);

    // A real, buyable number. The whole point of the sprint.
    expect(totalBoards(groups)).toBeGreaterThan(0);
    expect(totalBoards(groups)).toBeLessThan(12);
  });
});
