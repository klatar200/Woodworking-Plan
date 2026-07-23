/**
 * Guards for the Run 1 audit pipeline (scripts/run1-*.mjs).
 *
 * These are not application code, but they decide what prose reaches real builders, and
 * two of them are subtle enough to regress silently — one already did, in the direction
 * that rejects correct work. Locking the behaviour here means a future edit to the regex
 * has to say so out loud.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain-node audit script, no types
import { verificationTier } from '../scripts/run1-apply-patch.mjs';
// @ts-expect-error — plain-node audit script, no types
import { packBoards } from '../scripts/run1-verify-packet.mjs';
// @ts-expect-error — plain-node audit script, no types
import { fastenerUniverse, lintPlan } from '../scripts/run1-number-lint.mjs';
// @ts-expect-error — plain-node audit script, no types
import { geometryNotes } from '../scripts/run1-box-geometry.mjs';

const STALE_STEP_REF = /\bsteps?\s+\d+(?![\d"″\-/]|\s*(?:in\b|inch|ft\b|feet\b))/gi;

describe('stale step cross-references', () => {
  // A cut step inserted at index 0 renumbers everything after it, so a numeric reference
  // in an untouched step silently starts pointing at the wrong step.
  it.each(['before step 7', 'see steps 3 and 4', 'as in Step 2 above'])(
    'flags the reference in %j',
    (text) => {
      expect(new RegExp(STALE_STEP_REF).test(text)).toBe(true);
    },
  );

  /**
   * "steps" is also a PART — a bunk ladder has them, with lengths. The first version of
   * this guard rejected a correct patch over "four hanging mid-bunk steps 29\"", because
   * `\d+` backtracked a digit to satisfy the lookahead and matched "steps 2". A guard
   * that cries wolf is how the next real stale reference gets waved through.
   */
  it.each([
    'four hanging mid-bunk steps 29"',
    'bunk steps 29-1/4"',
    'steps 12 inches apart',
    'steps 3 ft apart',
  ])('does not flag the part or spacing in %j', (text) => {
    expect(new RegExp(STALE_STEP_REF).test(text)).toBe(false);
  });
});

describe('packBoards', () => {
  it('charges a kerf per cut, so six 16" parts do not fit a 96" board', () => {
    expect(packBoards(Array(6).fill(16), 96).boards).toBe(2);
  });

  it('cross-pairs different lengths onto one board', () => {
    // The false-shortfall defect: binning each length separately says two boards.
    expect(packBoards([58.25, 37.5], 96).boards).toBe(1);
  });

  it('returns null when a part cannot come off the stock at all', () => {
    expect(packBoards([120], 96)).toBeNull();
  });

  /**
   * FFD never uses fewer boards than optimal but can use more, so only a count matching
   * the length lower bound proves a shortfall. Two 72" parts cannot share a 96" board,
   * so the true minimum is 2 while length alone would allow ceil(144/96) = 2 as well.
   */
  it('reports a count matching the length bound as provable', () => {
    expect(packBoards([40, 40], 96)).toMatchObject({ boards: 1, lowerBound: 1, provable: true });
  });

  /**
   * Two 48" pieces do NOT come off a 96" board — the cut between them eats 1/8". The
   * length bound cannot see that (it ignores kerf, which is what keeps it a sound LOWER
   * bound), so this case is correctly reported as unproven rather than as a shortfall.
   */
  it('charges the kerf even when the parts sum to exactly the stock length', () => {
    expect(packBoards([48, 48], 96)).toMatchObject({ boards: 2, lowerBound: 1, provable: false });
  });

  it('reports a count above the length bound as unproven', () => {
    // 153" of parts allows 2 boards by length, but three 51" pieces cannot pair on a
    // 96" board, so FFD needs 3. That gap is exactly what must not be asserted as a
    // shortfall without an argument from the part lengths themselves.
    const forced = packBoards([51, 51, 51], 96);
    expect(forced).toMatchObject({ boards: 3, lowerBound: 2, provable: false });
  });
});

describe('fastener sizes', () => {
  const plan = (materials: unknown[], body: string) => ({
    description: '',
    materials,
    cutList: [],
    tools: [],
    steps: [{ title: 'Assemble', body, tools: [], materials: [] }],
  });

  it('flags a size the plan does not sell', () => {
    const p = plan([{ name: 'Wood screws, 2-1/2"', quantity: 1, unit: 'each' }], 'Drive 2" screws.');
    expect(lintPlan(p).filter((f: { note?: string }) => f.note)).toHaveLength(1);
  });

  it('accepts a size the plan does sell', () => {
    const p = plan([{ name: 'Wood screws, 2"', quantity: 1, unit: 'each' }], 'Drive 2" screws.');
    expect(lintPlan(p).filter((f: { note?: string }) => f.note)).toHaveLength(0);
  });

  /**
   * "2\" self-tapping wood screws OR pocket hole screws" binds the size to the first
   * option; the alternative is unsized. Reading the row as "screws are 2\" and nothing
   * else" invents a defect out of punctuation.
   */
  it('treats an alternatives row as unable to establish a contradiction', () => {
    const p = plan(
      [{ name: '2" self-tapping wood screws or pocket hole screws', quantity: 1, unit: 'each' }],
      'Drive 1-1/4" pocket screws.',
    );
    expect(fastenerUniverse(p).has('screw')).toBe(false);
    expect(lintPlan(p).filter((f: { note?: string }) => f.note)).toHaveLength(0);
  });

  it('does not read "screw" as a verb after a part length', () => {
    const p = plan(
      [{ name: 'Deck screws, 3"', quantity: 1, unit: 'each' }],
      'Cut four pickets at 16" and screw them across the frame.',
    );
    expect(lintPlan(p).filter((f: { note?: string }) => f.note)).toHaveLength(0);
  });
});

describe('box geometry solver', () => {
  const box = (a: number, b: number, panelW: number, panelL: number, t = 0.75) => ({
    cutList: [
      { part: 'A member', quantity: 2, thicknessIn: t, widthIn: 3.5, lengthIn: a },
      { part: 'B member', quantity: 2, thicknessIn: t, widthIn: 3.5, lengthIn: b },
      { part: 'Panel', quantity: 1, thicknessIn: 0.25, widthIn: panelW, lengthIn: panelL },
    ],
  });

  /**
   * The two cases that cost real rejections, reduced to their arithmetic.
   * printers-console-table: a 58" x 33" back proves the 33" sides run full height, so the
   * 56-1/2" top and bottom sit between them — the rewrite had it backwards and told the
   * builder to cut two correct shelves shorter.
   */
  it('reads an OUTER panel as proving the other member runs full', () => {
    const notes = geometryNotes(box(56.5, 33, 58, 33));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('"B member" (33") runs the FULL length');
    expect(notes[0]).toContain('"A member" (56-1/2") sits BETWEEN');
  });

  /**
   * mini-farmhouse-bedside-table: a 9" x 11-1/4" drawer bottom proves the 10-1/2" fronts
   * wrap OUTSIDE the 11-1/4" sides (10-1/2 less two 3/4" = 9). The rewrite reversed it and
   * built a 12" box for a 10-3/4" opening.
   */
  it('reads an INNER panel as proving the same member runs full', () => {
    const notes = geometryNotes(box(10.5, 11.25, 9, 11.25));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('"A member" (10-1/2") runs the FULL length');
  });

  it('claims nothing when no panel closes on either reading', () => {
    expect(geometryNotes(box(20, 10, 7, 3))).toHaveLength(0);
  });

  it('refuses a square frame, which settles nothing', () => {
    expect(geometryNotes(box(12, 12, 13.5, 12))).toHaveLength(0);
  });

  it('reports a contradiction instead of picking the first answer', () => {
    // Two panels, one proving each reading — the plan disagrees with itself.
    const plan = box(20, 10, 20, 11.5);
    plan.cutList.push({ part: 'Second panel', quantity: 1, thicknessIn: 0.25, widthIn: 21.5, lengthIn: 10 });
    const notes = geometryNotes(plan);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('OPPOSITE readings');
    expect(notes.join()).not.toContain('runs the FULL length');
  });
});

describe('verification tiering', () => {
  const nextPlan = { steps: [{ title: 'T', body: 'Cut the rails.' }] };

  it('never auto-applies a prose rewrite', () => {
    // Tracing every number proves no dimension was invented; it proves nothing about
    // what the sentence does with them.
    expect(verificationTier({ derived: [], untraceable: [] }, {}, nextPlan)).toBe('single');
  });

  it('escalates an untraceable number to the full panel', () => {
    expect(verificationTier({ derived: [], untraceable: [{}] }, {}, nextPlan)).toBe('triple');
  });

  it('escalates a declared shortfall claim to the full panel', () => {
    expect(
      verificationTier({ derived: [], untraceable: [] }, { shortfallClaim: true }, nextPlan),
    ).toBe('triple');
  });

  it('does not escalate a shortfall that was ruled OUT', () => {
    const cleared = { steps: [{ title: 'T', body: 'Both sizes pack comfortably — no shortfall.' }] };
    expect(verificationTier({ derived: [], untraceable: [] }, {}, cleared)).toBe('single');
  });
});
