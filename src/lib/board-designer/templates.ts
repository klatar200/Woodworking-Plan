import type {
  BoardDesignConfig,
  Panel,
  RowStep,
  RowTransform,
  Strip,
} from './types';

function strip(id: string, speciesId: string, widthIn: number): Strip {
  return { id, speciesId, widthIn, repeat: 1 };
}

function panel(
  id: string,
  label: string,
  thicknessIn: number,
  strips: Strip[],
): Panel {
  return { id, label, thicknessIn, strips };
}

function step(panelId: string, transform: RowTransform = 'none'): RowStep {
  return { panelId, transform };
}

const BASE = {
  schemaVersion: 2 as const,
  kerfIn: 0.125,
  wasteFactor: 0.15,
};

/** Alternating maple / walnut, count strips × 1.5″. */
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
      sliceThicknessIn: 0.75,
      panels: [
        panel('panel-1', 'Panel 1', 0.75, [
          strip('cs-1', 'hard-maple', 1.5),
          strip('cs-2', 'walnut', 1.5),
          strip('cs-3', 'hard-maple', 1.5),
          strip('cs-4', 'walnut', 1.5),
          strip('cs-5', 'hard-maple', 1.5),
          strip('cs-6', 'walnut', 1.5),
          strip('cs-7', 'hard-maple', 1.5),
        ]),
      ],
      rowPattern: [step('panel-1')],
      rowCount: 1,
    },
  },
  {
    id: 'checkerboard',
    config: {
      ...BASE,
      name: 'Checkerboard',
      grain: 'end',
      sourceLengthIn: 14,
      sliceThicknessIn: 1.5,
      panels: [
        panel('panel-1', 'Panel 1', 1.5, mapleWalnutAlternating(12, 'cb')),
      ],
      rowPattern: [step('panel-1', 'none'), step('panel-1', 'rot180')],
      // floor((14+0.125)/(1.5+0.125)) = 8 — migrate-equivalent for the old template
      rowCount: 8,
    },
  },
  {
    id: 'butcher-block',
    config: {
      ...BASE,
      name: 'Butcher block',
      grain: 'edge',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        panel('panel-1', 'Panel 1', 1.5, [
          strip('bb-1', 'hard-maple', 2.5),
          strip('bb-2', 'walnut', 1),
          strip('bb-3', 'hard-maple', 2.5),
          strip('bb-4', 'walnut', 1),
          strip('bb-5', 'hard-maple', 2.5),
        ]),
      ],
      rowPattern: [step('panel-1')],
      rowCount: 1,
    },
  },
  {
    id: 'accent-stripe',
    config: {
      ...BASE,
      name: 'Accent stripe',
      grain: 'edge',
      sourceLengthIn: 16,
      sliceThicknessIn: 0.75,
      panels: [
        panel('panel-1', 'Panel 1', 0.75, [
          strip('as-1', 'hard-maple', 2.5),
          strip('as-2', 'purpleheart', 0.5),
          strip('as-3', 'hard-maple', 5),
          strip('as-4', 'purpleheart', 0.5),
          strip('as-5', 'hard-maple', 2.5),
        ]),
      ],
      rowPattern: [step('panel-1')],
      rowCount: 1,
    },
  },
  {
    id: 'plaid',
    config: {
      ...BASE,
      name: 'Plaid',
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        panel('wide-a', 'Wide A', 1.75, [
          strip('pl-a1', 'hard-maple', 1.75),
          strip('pl-a2', 'purpleheart', 0.25),
          strip('pl-a3', 'cherry', 1.75),
          strip('pl-a4', 'purpleheart', 0.25),
          strip('pl-a5', 'walnut', 1.75),
          strip('pl-a6', 'purpleheart', 0.25),
          strip('pl-a7', 'cherry', 1.75),
          strip('pl-a8', 'purpleheart', 0.25),
          strip('pl-a9', 'hard-maple', 1.75),
        ]),
        panel('wide-b', 'Wide B', 1.75, [
          strip('pl-b1', 'cherry', 1.75),
          strip('pl-b2', 'purpleheart', 0.25),
          strip('pl-b3', 'walnut', 1.75),
          strip('pl-b4', 'purpleheart', 0.25),
          strip('pl-b5', 'hard-maple', 1.75),
          strip('pl-b6', 'purpleheart', 0.25),
          strip('pl-b7', 'walnut', 1.75),
          strip('pl-b8', 'purpleheart', 0.25),
          strip('pl-b9', 'cherry', 1.75),
        ]),
        panel('line', 'Line', 0.25, [strip('pl-l1', 'purpleheart', 9.75)]),
      ],
      rowPattern: [
        step('wide-a'),
        step('line'),
        step('wide-b'),
        step('line'),
      ],
      rowCount: 12,
    },
  },
  {
    id: 'brick',
    config: {
      ...BASE,
      name: 'Brick',
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        panel('full', 'Full course', 1.5, [
          strip('br-f1', 'walnut', 2),
          strip('br-f2', 'hard-maple', 0.25),
          strip('br-f3', 'walnut', 2),
          strip('br-f4', 'hard-maple', 0.25),
          strip('br-f5', 'walnut', 2),
          strip('br-f6', 'hard-maple', 0.25),
          strip('br-f7', 'walnut', 2),
        ]),
        panel('half', 'Half course', 1.5, [
          strip('br-h1', 'walnut', 0.875),
          strip('br-h2', 'hard-maple', 0.25),
          strip('br-h3', 'walnut', 2),
          strip('br-h4', 'hard-maple', 0.25),
          strip('br-h5', 'walnut', 2),
          strip('br-h6', 'hard-maple', 0.25),
          strip('br-h7', 'walnut', 2),
          strip('br-h8', 'hard-maple', 0.25),
          strip('br-h9', 'walnut', 0.875),
        ]),
      ],
      rowPattern: [step('full'), step('half')],
      rowCount: 12,
    },
  },
  {
    id: 'diagonal',
    config: {
      ...BASE,
      name: 'Diagonal',
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        panel(
          'course-1',
          'Course 1',
          1.5,
          diagonalCourse('d1', [
            'hard-maple',
            'cherry',
            'walnut',
            'purpleheart',
            'hard-maple',
            'cherry',
            'walnut',
            'purpleheart',
          ]),
        ),
        panel(
          'course-2',
          'Course 2',
          1.5,
          diagonalCourse('d2', [
            'cherry',
            'walnut',
            'purpleheart',
            'hard-maple',
            'cherry',
            'walnut',
            'purpleheart',
            'hard-maple',
          ]),
        ),
        panel(
          'course-3',
          'Course 3',
          1.5,
          diagonalCourse('d3', [
            'walnut',
            'purpleheart',
            'hard-maple',
            'cherry',
            'walnut',
            'purpleheart',
            'hard-maple',
            'cherry',
          ]),
        ),
        panel(
          'course-4',
          'Course 4',
          1.5,
          diagonalCourse('d4', [
            'purpleheart',
            'hard-maple',
            'cherry',
            'walnut',
            'purpleheart',
            'hard-maple',
            'cherry',
            'walnut',
          ]),
        ),
      ],
      rowPattern: [
        step('course-1'),
        step('course-2'),
        step('course-3'),
        step('course-4'),
      ],
      rowCount: 12,
    },
  },
  {
    id: 'thue-morse',
    config: {
      ...BASE,
      name: 'Thue-Morse',
      grain: 'end',
      sourceLengthIn: 20,
      sliceThicknessIn: 1.5,
      panels: [
        panel('course', 'Course', 1.5, [
          strip('tm-1', 'walnut', 1.5),
          strip('tm-2', 'hard-maple', 1.5),
          strip('tm-3', 'hard-maple', 1.5),
          strip('tm-4', 'walnut', 1.5),
          strip('tm-5', 'hard-maple', 1.5),
          strip('tm-6', 'walnut', 1.5),
          strip('tm-7', 'walnut', 1.5),
          strip('tm-8', 'hard-maple', 1.5),
        ]),
      ],
      rowPattern: [
        step('course', 'none'),
        step('course', 'rot180'),
        step('course', 'rot180'),
        step('course', 'none'),
        step('course', 'rot180'),
        step('course', 'none'),
        step('course', 'none'),
        step('course', 'rot180'),
      ],
      rowCount: 8,
    },
  },
];

function diagonalCourse(prefix: string, species: string[]): Strip[] {
  return species.map((speciesId, i) =>
    strip(`${prefix}-${i + 1}`, speciesId, 1.25),
  );
}

export function getTemplate(id: string): BoardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
