import { describe, it, expect } from 'vitest';
import {
  formatStepBody,
  splitSentences,
  boldFasteners,
  type StepBlock,
} from '@/lib/step-format';

/**
 * Runtime step-body formatter — Sprint 46 (Workstream F).
 *
 * The fixtures are REAL step bodies from published content/plans (the same strings the
 * F1 example showed), not invented ones — the value of the formatter is entirely in what
 * it does to the prose that actually ships. The load-bearing property is FAIL SOFT: a
 * paragraph the heuristics are not confident about must come back as a plain paragraph,
 * byte-for-byte, so the formatter can never garble a step.
 */

const listItems = (block: StepBlock | undefined): string[] =>
  block && block.kind === 'list' ? block.items : [];

describe('splitSentences', () => {
  it('splits on sentence punctuation followed by a capital', () => {
    expect(splitSentences('Cut the board. Sand the edge.')).toEqual([
      'Cut the board.',
      'Sand the edge.',
    ]);
  });

  it('does NOT split inside a tape-measure dimension', () => {
    // `88".` is an inch mark then a boundary; `39-1/2"` mid-sentence must not split.
    const s = splitSentences('Cut the top at 88" and the two sides at 39-1/2" each. Then assemble.');
    expect(s).toEqual([
      'Cut the top at 88" and the two sides at 39-1/2" each.',
      'Then assemble.',
    ]);
  });

  it('keeps a colon-introduced inline list as one sentence', () => {
    const s = splitSentences('Crosscut the carcass: the top at 88", two sides at 39-1/2".');
    expect(s).toHaveLength(1);
  });
});

describe('boldFasteners — narrow, fastener-adjacent only', () => {
  it('bolds an inch size followed by a fastener noun', () => {
    expect(boldFasteners('Attach with 1-1/4" pocket hole screws and glue.')).toContain(
      '**1-1/4" pocket hole screws**',
    );
  });

  it('bolds a # gauge', () => {
    expect(boldFasteners('Drive #8 x 2" screws from the inside.')).toContain('**#8 x 2"**');
  });

  it('does NOT bold a bare cut dimension', () => {
    // The buffet cut step is a wall of dimensions; only fasteners should light up.
    const out = boldFasteners('Rip the sheet into 15-3/4" strips and cut the top at 88".');
    expect(out).not.toContain('**15-3/4"**');
    expect(out).not.toContain('**88"**');
  });

  it('leaves authored **bold** alone (no double-wrapping)', () => {
    const authored = 'Set the depth so **1/8" of walnut remains** over each magnet.';
    expect(boldFasteners(authored)).toBe(authored);
  });
});

describe('formatStepBody — action sequences become lists', () => {
  it('turns a dense, clearly-sequenced paragraph into a bulleted action list', () => {
    // extra-long-buffet-cabinet-drawers, step 1 (real body).
    const body =
      'Rip both 3/4" sheets into 15-3/4" strips on the table saw, then crosscut the carcass: the top and bottom at 88", two sides at 39-1/2", two dividers at 34" and four shelves at 26-1/2". Cut the face frame from its own stock — the 1x3 top rail at 89-1/2", four 1x3 stiles at 31-1/2", the 1x6 bottom rail at 89-1/2" and two 1x2 drawer trims at 33-1/2" — and cut five 1x4 top planks at 91". Leave the drawer boxes, the doors and both mouldings until the carcass and face frame are up and you can measure real openings; the cut list marks the drawer sides and door frames cut-to-fit for exactly that reason. Cut the two 88" panels as a pair and the two 39-1/2" sides as a pair — across nearly eight feet, a small length difference becomes a visible twist.';

    const blocks = formatStepBody(body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.kind).toBe('list');
    const items = listItems(blocks[0]);
    expect(items).toHaveLength(4);
    expect(items[0]).toMatch(/^Rip both/);
    expect(items[1]).toMatch(/^Cut the face frame/);
    expect(items[3]).toMatch(/^Cut the two 88"/);
  });

  it('attaches a reasoning sentence to the action line above it, not its own bullet', () => {
    // happier-homemaker-farmhouse-table, step 2 para 2 (real body): action, reason, action.
    const body =
      'Glue every joint. A brad nailer with 2" brads is easy here because the heads hide in the joint line, but 2-1/2" screws driven from what becomes the inside face hold better and never show. Mark both ends off the same layout — the plan does not fix the lower stretcher’s height, so the only thing that matters is that the two ends agree with each other.';

    const items = listItems(formatStepBody(body)[0]);
    expect(items).toHaveLength(2);
    // The reasoning ("A brad nailer…") is welded onto "Glue every joint", not a bullet.
    expect(items[0]).toMatch(/^Glue every joint\. A brad nailer/);
    expect(items[1]).toMatch(/^Mark both ends/);
  });

  it('bolds fastener sizes inside list items but leaves cut dimensions plain', () => {
    const body =
      'Drill 3/4" pocket holes in both ends of the 88" top and bottom. Assemble with glue and 1-1/4" pocket hole screws, keeping it square. Set the two dividers inside to split the run into three bays.';
    const items = listItems(formatStepBody(body)[0]);
    expect(items.join('\n')).toContain('**1-1/4" pocket hole screws**');
    expect(items.join('\n')).not.toContain('**88"**');
  });
});

describe('formatStepBody — fail soft (never garble)', () => {
  it('leaves a short paragraph exactly as a single paragraph block', () => {
    const body = 'Mark out the window and door locations, then cut them out with a jigsaw.';
    const blocks = formatStepBody(body);
    expect(blocks).toEqual([{ kind: 'paragraph', text: body }]);
  });

  it('keeps a two-sentence action + reason as a paragraph, not a list', () => {
    // Below the 3-sentence threshold — reads fine as prose, so it stays prose.
    const body =
      'Attach the plywood to the front legs with 1-1/4" screws and glue. This hides the seam and makes the wall read as one panel.';
    const blocks = formatStepBody(body);
    expect(blocks[0]!.kind).toBe('paragraph');
  });

  it('keeps narrative prose (no action leads) as paragraphs', () => {
    const body =
      'This table is the whole trick: mass and screw-holding out of stock you were already buying. It should last a generation if you keep it out of the weather.';
    expect(formatStepBody(body).every((b) => b.kind === 'paragraph')).toBe(true);
  });

  it('preserves paragraph breaks and never drops text', () => {
    const body = 'Cut the parts to length. Sand every face. Dry-fit the whole thing.\n\nThen glue it up.';
    const blocks = formatStepBody(body);
    expect(blocks).toHaveLength(2);
    // Nothing is lost: every source sentence survives somewhere in the output.
    const flat = blocks
      .map((b) => (b.kind === 'list' ? b.items.join(' ') : b.text))
      .join(' ');
    for (const frag of ['Cut the parts', 'Sand every face', 'Dry-fit', 'Then glue it up']) {
      expect(flat).toContain(frag);
    }
  });

  it('handles empty and whitespace input without throwing', () => {
    expect(() => formatStepBody('')).not.toThrow();
    expect(formatStepBody('   ').every((b) => b.kind === 'paragraph')).toBe(true);
  });
});
