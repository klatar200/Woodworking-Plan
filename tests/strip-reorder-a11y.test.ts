import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  findPrimaryStripMove,
  formatStripReorderAnnouncement,
  stripReorderAnnouncement,
} from '@/lib/board-designer/strip-reorder-announce';
import { stripDisplayName } from '@/lib/board-designer/strip-display';
import { makeStrip } from './fixtures/board-design';

describe('strip reorder a11y — Sprint 65 fix pass', () => {
  it('drag handle is out of the tab order (pointer-only; arrows are the keyboard path)', () => {
    const src = readFileSync('src/components/designer/strip-list.tsx', 'utf8');
    expect(src).toMatch(/tabIndex=\{-1\}/);
    expect(src).toMatch(/aria-hidden="true"/);
    expect(src).not.toMatch(/aria-label=\{`Drag to reorder/);
    expect(src).toMatch(/onMove\(strip\.id,\s*-1\)/);
    expect(src).toMatch(/onMove\(strip\.id,\s*1\)/);
  });

  it('strip-list announces at call sites and on undo/redo via strips effect', () => {
    const src = readFileSync('src/components/designer/strip-list.tsx', 'utf8');
    expect(src).toContain('stripReorderAnnouncement');
    expect(src).toContain('formatStripReorderAnnouncement');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('skipEffectAnnounceRef');
  });

  it('reorder writes the expected live-region string; same-index writes nothing', () => {
    const strips = [
      makeStrip('s1', 'hard-maple'),
      makeStrip('s2', 'walnut'),
      makeStrip('s3', 'cherry'),
    ];
    const prevIds = strips.map((s) => s.id);

    expect(formatStripReorderAnnouncement(prevIds, strips)).toBeNull();
    expect(findPrimaryStripMove(prevIds, prevIds)).toBeNull();

    // Call-site string for drag/arrow (acted-upon strip).
    expect(stripReorderAnnouncement(strips[0]!, 0, 2, 3)).toBe(
      'Strip 1 moved to position 3 of 3',
    );

    // Observed multi-step: Hard Maple 0 → 2 is unique by travel distance.
    const reordered = [strips[1]!, strips[2]!, strips[0]!];
    expect(formatStripReorderAnnouncement(prevIds, reordered)).toBe(
      'Strip 1 moved to position 3 of 3',
    );

    // Observed adjacent: stable lower-fromIndex picks the acted strip for a
    // Toward-right on Hard Maple ([s1,s2,s3] → [s2,s1,s3]).
    const oneStep = [strips[1]!, strips[0]!, strips[2]!];
    expect(formatStripReorderAnnouncement(prevIds, oneStep)).toBe(
      'Strip 1 moved to position 2 of 3',
    );

    // Undo of that adjacent move: lower-from picks Walnut (also a valid splice).
    // Call-site already named Hard Maple on the forward action; undo observation
    // still writes a non-empty announce (requirement: not silent).
    expect(formatStripReorderAnnouncement(
      oneStep.map((s) => s.id),
      strips,
    )).toBe('Strip 1 moved to position 2 of 3');
  });

  it('strip display names prefer trimmed labels', () => {
    expect(stripDisplayName({ ...makeStrip('s1', 'hard-maple'), label: '  Accent rail  ' }, 0)).toBe(
      'Accent rail',
    );
    expect(stripDisplayName(makeStrip('s2', 'walnut'), 1)).toBe('Strip 2');
    expect(stripReorderAnnouncement(
      { ...makeStrip('s3', 'cherry'), label: 'Cherry pin' },
      2,
      0,
      3,
    )).toBe('Cherry pin moved to position 1 of 3');
  });

  it('length changes and non-reorder edits are silent', () => {
    const a = [makeStrip('s1', 'hard-maple'), makeStrip('s2', 'walnut')];
    const longer = [...a, makeStrip('s3', 'cherry')];
    expect(formatStripReorderAnnouncement(
      a.map((s) => s.id),
      longer,
    )).toBeNull();

    const relabeled = [
      makeStrip('s1', 'cherry'),
      makeStrip('s2', 'walnut'),
    ];
    expect(formatStripReorderAnnouncement(
      a.map((s) => s.id),
      relabeled,
    )).toBeNull();
  });
});
