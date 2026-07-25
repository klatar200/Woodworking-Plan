import type { BoardDesignConfig, Strip } from './types';

function strip(
  id: string,
  speciesId: string,
  widthIn: number,
): Strip {
  return { id, speciesId, widthIn, repeat: 1 };
}

const BASE = {
  schemaVersion: 1 as const,
  kerfIn: 0.125,
  wasteFactor: 0.15,
  flipEveryOtherSlice: false,
};

/** Alternating maple / walnut, 12 strips × 1.5″ — the checkerboard panel. */
function mapleWalnutAlternating(count: number, idPrefix: string): Strip[] {
  const out: Strip[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      strip(
        `${idPrefix}-${i + 1}`,
        i % 2 === 0 ? 'hard-maple' : 'walnut',
        1.5,
      ),
    );
  }
  return out;
}

export interface BoardTemplate {
  id: string;
  config: BoardDesignConfig;
}

export const TEMPLATES: readonly BoardTemplate[] = [
  {
    id: 'classic-stripe',
    config: {
      ...BASE,
      name: 'Classic stripe',
      grain: 'edge',
      sourceLengthIn: 18,
      stockThicknessIn: 0.75,
      sliceThicknessIn: 0.75,
      strips: [
        strip('cs-1', 'hard-maple', 1.5),
        strip('cs-2', 'walnut', 1.5),
        strip('cs-3', 'hard-maple', 1.5),
        strip('cs-4', 'walnut', 1.5),
        strip('cs-5', 'hard-maple', 1.5),
        strip('cs-6', 'walnut', 1.5),
        strip('cs-7', 'hard-maple', 1.5),
      ],
    },
  },
  {
    id: 'checkerboard',
    config: {
      ...BASE,
      name: 'Checkerboard',
      grain: 'end',
      sourceLengthIn: 14,
      stockThicknessIn: 1.5,
      sliceThicknessIn: 1.5,
      flipEveryOtherSlice: true,
      strips: mapleWalnutAlternating(12, 'cb'),
    },
  },
  {
    id: 'butcher-block',
    config: {
      ...BASE,
      name: 'Butcher block',
      grain: 'edge',
      sourceLengthIn: 20,
      stockThicknessIn: 1.5,
      sliceThicknessIn: 1.5,
      strips: [
        strip('bb-1', 'hard-maple', 2.5),
        strip('bb-2', 'walnut', 1),
        strip('bb-3', 'hard-maple', 2.5),
        strip('bb-4', 'walnut', 1),
        strip('bb-5', 'hard-maple', 2.5),
      ],
    },
  },
  {
    id: 'accent-stripe',
    config: {
      ...BASE,
      name: 'Accent stripe',
      grain: 'edge',
      sourceLengthIn: 16,
      stockThicknessIn: 0.75,
      sliceThicknessIn: 0.75,
      strips: [
        strip('as-1', 'hard-maple', 2.5),
        strip('as-2', 'purpleheart', 0.5),
        strip('as-3', 'hard-maple', 5),
        strip('as-4', 'purpleheart', 0.5),
        strip('as-5', 'hard-maple', 2.5),
      ],
    },
  },
];

export function getTemplate(id: string): BoardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
