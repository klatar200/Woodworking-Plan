/**
 * @vitest-environment jsdom
 *
 * Sprint 77 T3 — Collapse/Delete legibility in the panel header.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelEditor } from '@/components/designer/panel-editor';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { btnDanger, btnGhost } from '@/lib/ui';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

afterEach(() => cleanup());

const source = readFileSync(
  join(process.cwd(), 'src/components/designer/panel-editor.tsx'),
  'utf8',
);

describe('PanelEditor header — Collapse vs Delete (Sprint 77)', () => {
  it('Delete accessible name includes the panel label; classes differ from Collapse', () => {
    const config = makeV2Config({
      panels: [
        makePanel('p1', 'Panel 1', 1.5, [makeStrip('a', 'walnut')]),
        makePanel('p2', 'Panel 2', 1.5, [makeStrip('b', 'hard-maple')]),
      ],
      rowPattern: [
        { panelId: 'p1', transform: 'none' },
        { panelId: 'p1', transform: 'none' },
        { panelId: 'p2', transform: 'none' },
      ],
      rowCount: 6,
    });
    render(
      <PanelEditor
        config={config}
        metrics={calculateMetrics(config)}
        dispatch={vi.fn()}
        onCommitCoalesce={vi.fn()}
      />,
    );

    const del = screen.getByRole('button', { name: 'Delete Panel 2' });
    expect(del.getAttribute('aria-label')).toBe('Delete Panel 2');
    expect(del.className).toBe(btnDanger);
    expect(del.className).not.toBe(btnGhost);
    expect(del.className).toContain('min-h-[2.75rem]');

    const collapse = screen.getAllByRole('button', { name: /Collapse|Expand/ })[0]!;
    expect(collapse.className).toBe(btnGhost);
    expect(collapse.className).toContain('min-h-[2.75rem]');
    expect(collapse.getAttribute('aria-expanded')).toMatch(/true|false/);

    // Row count still singular/plural; not wedged between the two controls in source.
    expect(screen.getByText('4 rows')).toBeTruthy();
    expect(screen.getByText('2 rows')).toBeTruthy();
    expect(source).toMatch(/rows === 1 \? 'row' : 'rows'/);
    expect(source).not.toMatch(
      /aria-expanded[\s\S]{0,200}rows === 1[\s\S]{0,200}Delete/,
    );
  });

  it('Delete is disabled when the design has one panel', () => {
    const config = makeV2Config({
      panels: [makePanel('p1', 'Panel 1', 1.5, [makeStrip('a', 'walnut')])],
      rowCount: 1,
    });
    render(
      <PanelEditor
        config={config}
        metrics={calculateMetrics(config)}
        dispatch={vi.fn()}
        onCommitCoalesce={vi.fn()}
      />,
    );
    expect(
      (screen.getByRole('button', { name: 'Delete Panel 1' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText('1 row')).toBeTruthy();
  });

  it('uses btnDanger (existing token) — no new hex / no dark: utility', () => {
    expect(source).toContain('btnDanger');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(source).not.toMatch(/\bdark:/);
    expect(btnDanger).toContain('text-err');
  });
});
