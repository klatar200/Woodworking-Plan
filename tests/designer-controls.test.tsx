/**
 * @vitest-environment jsdom
 *
 * Sprint 81 — every designer control does what it says: number fields can be cleared and retyped,
 * caps disable the buttons that would break them, Collapse collapses, miters stay end-grain, the
 * phone view links to the build plan, library delete asks first, and a crash is recoverable.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DesignerError from '@/app/designer/error';
import { BoundedNumberInput } from '@/components/designer/bounded-number-input';
import { DeleteDesignButton } from '@/components/designer/delete-design-button';
import { DesignerNarrowSurface } from '@/components/designer/designer-narrow';
import { PanelEditor } from '@/components/designer/panel-editor';
import { StripList } from '@/components/designer/strip-list';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => cleanup());

const strips = (n: number, prefix: string): Strip[] =>
  Array.from({ length: n }, (_, i) => makeStrip(`${prefix}${i}`, 'walnut'));

function stripList(props: Partial<Parameters<typeof StripList>[0]> & { strips: Strip[] }) {
  return render(
    <StripList
      grain="end"
      panelThicknessIn={1.5}
      onAdd={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      onMove={vi.fn()}
      onReorder={vi.fn()}
      onUpdate={vi.fn()}
      onCommitCoalesce={vi.fn()}
      {...props}
    />,
  );
}

function panelEditor(config: BoardDesignConfig) {
  return render(
    <PanelEditor
      config={config}
      metrics={calculateMetrics(config)}
      dispatch={vi.fn()}
      onCommitCoalesce={vi.fn()}
    />,
  );
}

describe('BoundedNumberInput', () => {
  function widthInput() {
    const onValue = vi.fn();
    const onCommit = vi.fn();
    render(
      <BoundedNumberInput
        aria-label="Width"
        value={1.5}
        min={0.0625}
        max={24}
        step={0.0625}
        formatBound={formatInches}
        onValue={onValue}
        onCommit={onCommit}
      />,
    );
    return { input: screen.getByLabelText('Width') as HTMLInputElement, onValue, onCommit };
  }

  it('can be cleared without reporting a value, then takes a new one', () => {
    const { input, onValue } = widthInput();
    fireEvent.change(input, { target: { value: '' } });
    expect(onValue).not.toHaveBeenCalled();
    expect(input.value).toBe('');
    expect(screen.getByRole('status').textContent).toBe('Enter a number from 1/16" to 24".');
    fireEvent.change(input, { target: { value: '2.25' } });
    expect(onValue).toHaveBeenCalledWith(2.25);
  });

  it('ignores out-of-range text and puts the value back on blur', () => {
    const { input, onValue, onCommit } = widthInput();
    fireEvent.change(input, { target: { value: '30' } });
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(input.value).toBe('1.5');
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('rounds in integer mode', () => {
    const onValue = vi.fn();
    render(
      <BoundedNumberInput aria-label="Rows" value={8} min={1} max={60} step={1} integer onValue={onValue} />,
    );
    fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '3.6' } });
    expect(onValue).toHaveBeenCalledWith(4);
  });
});

describe('caps and the last strip', () => {
  it('StripList disables Add and Duplicate at the cap, and Delete on a panel’s only strip', () => {
    stripList({ strips: strips(2, 'a'), canAdd: false });
    expect(screen.getAllByRole('button', { name: 'Add a strip' }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Duplicate' }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Delete' }).every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
    cleanup();

    stripList({ strips: strips(1, 'b') });
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('PanelEditor passes the caps down and guards Add a panel', () => {
    panelEditor(makeV2Config({ panels: [makePanel('p1', 'P1', 1.5, strips(40, 'a'))] }));
    expect((screen.getByRole('button', { name: 'Add a strip' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    panelEditor(
      makeV2Config({
        panels: [
          makePanel('p1', 'P1', 1.5, strips(40, 'a')),
          makePanel('p2', 'P2', 1.5, strips(40, 'b')),
        ],
      }),
    );
    expect((screen.getByRole('button', { name: 'Add a panel' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Collapse', () => {
  it('collapses the open panel and Expand brings it back', () => {
    panelEditor(makeV2Config());
    const toggle = screen.getByRole('button', { name: 'Collapse' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Add a strip' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(screen.getByRole('button', { name: 'Add a strip' })).toBeTruthy();
  });
});

describe('edge-grain miters', () => {
  it('offers no miter on edge grain, and only removal for one left over', () => {
    stripList({ grain: 'edge', strips: [makeStrip('s1', 'hard-maple')] });
    expect(screen.queryByText('Mitered')).toBeNull();
    cleanup();

    stripList({
      grain: 'edge',
      strips: [
        { ...makeStrip('s1', 'hard-maple'), miter: { speciesId: 'walnut', angleDeg: 30, corner: 'tr' } },
      ],
    });
    expect(screen.getByText('Mitered')).toBeTruthy();
    expect(
      screen.getByText('Miters only apply to end-grain boards. Uncheck Mitered to remove it.'),
    ).toBeTruthy();
    expect(screen.queryByText('Wedge species')).toBeNull();
  });
});

describe('phone view of a saved board', () => {
  it('links to the build plan before the print sheet', () => {
    const config = getTemplate('checkerboard')!.config;
    const { container } = render(
      <DesignerNarrowSurface designId="d1" config={config} metrics={calculateMetrics(config)} />,
    );
    const build = screen.getByRole('link', { name: 'Build Plan' });
    expect(build.getAttribute('href')).toBe('/designer/d1/build');
    expect(container.textContent).toContain('Every cut, glue-up and slice, in order.');
    const print = screen.getByRole('link', { name: 'Print sheet' });
    expect(build.compareDocumentPosition(print) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('library delete', () => {
  it('asks before it submits, and Cancel backs out', () => {
    const { container } = render(
      <DeleteDesignButton designId="d1" name="Golden" action={vi.fn(async () => {})} />,
    );
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(container.textContent).toContain(`Delete "Golden"? This can't be undone.`);
    expect(screen.getByRole('button', { name: 'Delete board' }).getAttribute('type')).toBe('submit');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });
});

describe('designer error boundary', () => {
  it('renders one main with the recovery copy, Reload, and Saved Boards', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<DesignerError error={new Error('skew')} />);
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelector('main')?.id).toBe('main');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Something went wrong on this page.',
    );
    expect(container.textContent).toContain(
      'This usually means Notch was updated while the page was open. Reload to carry on — unsaved board changes in this tab are kept.',
    );
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Saved Boards' }).getAttribute('href')).toBe(
      '/designer/library',
    );
    spy.mockRestore();
  });

  it('is a client component', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/app/designer/error.tsx', 'utf8');
    expect(src.startsWith("'use client'")).toBe(true);
  });
});
