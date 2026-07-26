import { describe, expect, it } from 'vitest';
import { designMaterialLineName } from '@/lib/board-designer/design-shopping-label';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

describe('designMaterialLineName', () => {
  it('keeps bare species name when no custom strip labels', () => {
    const config = makeV2Config({
      grain: 'edge',
      panels: [
        makePanel('p', 'P', 1.5, [
          makeStrip('a', 'hard-maple'),
          makeStrip('b', 'walnut'),
        ]),
      ],
    });
    expect(designMaterialLineName(config, 'hard-maple', 'Hard Maple')).toBe(
      'Hard Maple',
    );
  });

  it('appends strip identities when any strip of that species is labelled', () => {
    const accent = makeStrip('a', 'hard-maple');
    accent.label = 'Accent A';
    const config = makeV2Config({
      grain: 'edge',
      panels: [
        makePanel('p', 'P', 1.5, [accent, makeStrip('b', 'hard-maple')]),
      ],
    });
    expect(designMaterialLineName(config, 'hard-maple', 'Hard Maple')).toBe(
      'Hard Maple (Accent A, Strip 2)',
    );
  });
});
