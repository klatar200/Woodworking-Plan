import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { closingThicknessHint } from '@/lib/board-designer/miter-geometry';
import { getTemplate, TEMPLATES } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

/**
 * §7: dimensions are tape-measure fractions, never decimals.
 * Mechanism — not a comment. Any user-facing designer string that looks like
 * `1.010″` fails this suite.
 */
const DECIMAL_INCH = /\d+\.\d+\s*[″"]/;

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ id: 'user_test' })),
}));

vi.mock('@/lib/board-designs', () => ({
  getDesign: vi.fn(),
}));

function assertNoDecimalInches(strings: string[], label: string) {
  for (const s of strings) {
    expect(s, `${label}: ${s}`).not.toMatch(DECIMAL_INCH);
  }
}

function printFacingStrings(config: BoardDesignConfig): string[] {
  const metrics = calculateMetrics(config);
  const out: string[] = [];
  out.push(
    [metrics.finishedLengthIn, metrics.finishedWidthIn, metrics.finishedThicknessIn]
      .map(formatInches)
      .join(' × '),
  );
  out.push(...metrics.warnings);
  for (const panel of config.panels) {
    out.push(formatInches(panel.thicknessIn));
    const plan = metrics.panelPlan.find((p) => p.panelId === panel.id);
    if (plan) {
      out.push(formatInches(plan.widthIn));
      out.push(formatInches(plan.requiredLengthIn));
      out.push(`${formatInches(plan.widthIn)} × ${formatInches(plan.thicknessIn)}`);
    }
    for (const strip of panel.strips) {
      out.push(formatInches(strip.widthIn));
      if (strip.miter) {
        out.push(
          closingThicknessHint(
            strip.widthIn,
            panel.thicknessIn,
            strip.miter.angleDeg,
          ),
        );
      }
    }
  }
  for (const row of metrics.boardFeetBySpecies) {
    // bd ft may have decimals; only inch strings are gated above.
    out.push(row.name);
  }
  return out.filter(Boolean);
}

describe('designer dimension display — no decimal inches (§7)', () => {
  it('metrics warnings + print-facing strings never use decimal inches', async () => {
    const solid = getTemplate('checkerboard')!.config;
    const miteredOk = getTemplate('harlequin')!.config;
    const miteredMismatch: BoardDesignConfig = {
      ...miteredOk,
      panels: miteredOk.panels.map((p) => ({ ...p, thicknessIn: 1.5 })),
    };
    const unknownSpecies = makeV2Config({
      panels: [
        makePanel('p1', 'P', 1.5, [
          makeStrip('s1', 'not-a-real-species', 1.25),
          {
            ...makeStrip('s2', 'hard-maple', 0.875),
            miter: { speciesId: 'also-fake', angleDeg: 30, corner: 'tr' },
          },
        ]),
      ],
      rowPattern: [{ panelId: 'p1', transform: 'none' }],
      rowCount: 4,
    });
    const deletedPanel = makeV2Config({
      panels: [makePanel('keep', 'Keep', 1.5, [makeStrip('s1', 'walnut')])],
      rowPattern: [
        { panelId: 'keep', transform: 'none' },
        { panelId: 'deleted-panel', transform: 'rot180' },
      ],
      rowCount: 4,
    });

    const configs = [
      solid,
      miteredOk,
      miteredMismatch,
      unknownSpecies,
      deletedPanel,
      ...TEMPLATES.map((t) => t.config),
    ];

    const collected: string[] = [];
    for (const config of configs) {
      collected.push(...calculateMetrics(config).warnings);
      collected.push(...printFacingStrings(config));
    }

    // Render the real print sheet for harlequin + mismatch (React → HTML text).
    const { getDesign } = await import('@/lib/board-designs');
    const { default: PrintPage } = await import('@/app/designer/[id]/print/page');
    for (const [id, config] of [
      ['design-harlequin', miteredOk],
      ['design-mismatch', miteredMismatch],
    ] as const) {
      vi.mocked(getDesign).mockResolvedValue({
        id,
        name: config.name,
        config,
        createdAt: new Date('2026-07-26T00:00:00Z'),
        updatedAt: new Date('2026-07-26T00:00:00Z'),
      });
      const html = renderToStaticMarkup(
        await PrintPage({ params: Promise.resolve({ id }) }),
      );
      // Strip tags → text nodes only.
      collected.push(html.replace(/<[^>]+>/g, ' '));
    }

    assertNoDecimalInches(collected, 'designer user-facing');
  });

  it('metrics path and hint helper produce the same mismatch string', () => {
    const widthIn = 0.875;
    const thicknessIn = 1.5;
    const angleDeg = 30;
    const hint = closingThicknessHint(widthIn, thicknessIn, angleDeg);
    const tpl = getTemplate('harlequin')!;
    const mismatched: BoardDesignConfig = {
      ...tpl.config,
      panels: tpl.config.panels.map((p) => ({ ...p, thicknessIn })),
    };
    const fromMetrics = calculateMetrics(mismatched).warnings.find((w) =>
      w.includes('lattice will not close'),
    );
    expect(fromMetrics).toBe(hint);
  });
});
