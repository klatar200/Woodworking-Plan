import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cutPlanGroupsForConfig } from '@/components/designer/optimizer-panel';
import { designCutPieces } from '@/lib/board-designer/cut-pieces';
import { defaultCutPlanStockWidthIn } from '@/lib/board-designer/design-cut-plan';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { formatMiterAngle } from '@/lib/board-designer/miter-labels';
import { panelGeometry } from '@/lib/board-designer/panel-geometry';
import { TEMPLATES, getTemplate } from '@/lib/board-designer/templates';
import { toParts } from '@/lib/board-designer/to-parts';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { totalBoards } from '@/lib/cut-optimizer';
import { formatBoardFeet } from '@/lib/format';

/**
 * Sprint 80 — one source of cut dimensions. The cut plan, the guide and the print sheet read
 * `designCutPieces`; these tests pin what it says for the real templates.
 */

const template = (id: string): BoardDesignConfig => getTemplate(id)!.config;
const piecesOf = (config: BoardDesignConfig) =>
  designCutPieces(config, panelGeometry(config).panelPlan);

/** Diagonal with its row pattern reduced to the first panel — three panels go unused. */
function diagonalFirstPanelOnly(): BoardDesignConfig {
  const diagonal = template('diagonal');
  const first = diagonal.panels[0]!.id;
  return {
    ...diagonal,
    rowPattern: diagonal.rowPattern.filter((step) => step.panelId === first),
  };
}

describe('formatMiterAngle', () => {
  it('writes whole degrees and halves without a decimal point', () => {
    expect(formatMiterAngle(30)).toBe('30°');
    expect(formatMiterAngle(22.5)).toBe('22½°');
    expect(formatMiterAngle(45)).toBe('45°');
  });
});

describe('designCutPieces', () => {
  it('Checkerboard: 12 strip pieces at 1.675 rip width and 14.275 cut length', () => {
    const pieces = piecesOf(template('checkerboard'));
    expect(pieces).toHaveLength(12);
    for (const piece of pieces) {
      expect(piece.role).toBe('strip');
      expect(piece.ripWidthIn).toBeCloseTo(1.675, 9);
      expect(piece.lengthIn).toBeCloseTo(14.275, 9);
      expect(piece.finishedWidthIn).toBe(1.5);
    }
  });

  it('Harlequin: every Hard Maple strip is followed by a Walnut partner of the same size', () => {
    const pieces = piecesOf(template('harlequin'));
    expect(pieces).toHaveLength(16);
    for (let i = 0; i < pieces.length; i += 2) {
      const strip = pieces[i]!;
      const partner = pieces[i + 1]!;
      expect(strip.role).toBe('strip');
      expect(strip.speciesId).toBe('hard-maple');
      expect(partner.role).toBe('partner');
      expect(partner.speciesId).toBe('walnut');
      expect(partner.thicknessIn).toBe(strip.thicknessIn);
      expect(partner.ripWidthIn).toBe(strip.ripWidthIn);
      expect(partner.lengthIn).toBe(strip.lengthIn);
      expect(partner.count).toBe(strip.count);
    }
  });

  it('an end-grain panel at 0 rows contributes no pieces', () => {
    const config = diagonalFirstPanelOnly();
    const unused = config.panels.slice(1).map((p) => p.id);
    const pieces = piecesOf(config);
    expect(pieces.length).toBeGreaterThan(0);
    expect(pieces.some((p) => unused.includes(p.panelId))).toBe(false);
  });

  it('source stays on the cheap path and applies no waste', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/board-designer/cut-pieces.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/from ['"]\.\/layout['"]/);
    expect(src).not.toMatch(/calculateMetrics\(/);
    expect(src).not.toMatch(/\.wasteFactor\b/);
  });
});

describe('cut plan (toParts → designCutPlan)', () => {
  it('emits no 0″ parts for unused panels', () => {
    const brickEdge: BoardDesignConfig = { ...template('brick'), grain: 'edge' };
    for (const config of [brickEdge, diagonalFirstPanelOnly()]) {
      const parts = toParts(config);
      expect(parts.length).toBeGreaterThan(0);
      expect(parts.every((p) => p.lengthIn > 0)).toBe(true);
    }
  });

  it('parts correspond one-to-one with cut pieces for every template', () => {
    for (const t of TEMPLATES) {
      const pieces = piecesOf(t.config);
      const parts = toParts(t.config);
      expect(parts, t.id).toHaveLength(pieces.length);
      parts.forEach((part, i) => {
        const piece = pieces[i]!;
        expect(part.quantity, t.id).toBe(piece.count);
        expect(part.thicknessIn, t.id).toBe(piece.thicknessIn);
        expect(part.widthIn, t.id).toBe(piece.ripWidthIn);
        expect(part.lengthIn, t.id).toBe(piece.lengthIn);
      });
    }
  });

  it('default stock buys [2, 2, 2, 3, 5, 3, 4, 2, 2] boards for the templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'classic-stripe',
      'checkerboard',
      'butcher-block',
      'accent-stripe',
      'plaid',
      'brick',
      'diagonal',
      'thue-morse',
      'harlequin',
    ]);
    expect(TEMPLATES.map((t) => totalBoards(cutPlanGroupsForConfig(t.config)))).toEqual([
      2, 2, 2, 3, 5, 3, 4, 2, 2,
    ]);
  });

  it('default stock width is the narrowest standard width every part fits', () => {
    expect(defaultCutPlanStockWidthIn(template('checkerboard'))).toBe(3.5);
    expect(defaultCutPlanStockWidthIn(template('accent-stripe'))).toBe(5.5);
    expect(defaultCutPlanStockWidthIn(template('plaid'))).toBe(11.25);
  });
});

describe('board feet are unchanged by Sprint 80 (R4)', () => {
  it('pins every template total', () => {
    expect(
      TEMPLATES.map((t) => formatBoardFeet(calculateMetrics(t.config).totalBoardFeet)),
    ).toEqual(['1.17', '3.19', '2.27', '1.03', '1.76', '2.45', '2.70', '2.12', '0.92']);
  });
});

describe('unused end-grain panel warning', () => {
  it('names each panel the row pattern skips, and only those', () => {
    const warnings = calculateMetrics(diagonalFirstPanelOnly()).warnings;
    for (const label of ['Course 2', 'Course 3', 'Course 4']) {
      expect(warnings).toContain(
        `"${label}" is not in the row pattern — it adds nothing to the board.`,
      );
    }
    expect(warnings.some((w) => w.includes('Course 1'))).toBe(false);
    expect(
      calculateMetrics(template('checkerboard')).warnings.some((w) =>
        w.includes('is not in the row pattern'),
      ),
    ).toBe(false);
  });
});

describe('one miter vocabulary', () => {
  it("'Top left' is written only in miter-labels.ts", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && readFileSync(path, 'utf8').includes("'Top left'")) {
          offenders.push(path.slice(process.cwd().length + 1).replace(/\\/g, '/'));
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(offenders).toEqual(['src/lib/board-designer/miter-labels.ts']);
  });
});
