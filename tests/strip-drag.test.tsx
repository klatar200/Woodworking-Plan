/**
 * @vitest-environment jsdom
 *
 * Sprint 66 Part B — exercise the strip drag *handlers*, not only `reorder-strip`.
 *
 * jsdom has no real layout: we stub `getBoundingClientRect` on each
 * `[data-strip-index]` row so `pointermove` clientY values map to drop indices.
 * Pointer capture APIs are also stubbed. This is honest coverage of the gesture
 * math + history wiring; it is not a browser pixel drag.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReducer } from 'react';
import { StripList } from '@/components/designer/strip-list';
import {
  canUndo,
  createHistoryState,
  historyReducer,
} from '@/lib/board-designer/history';
import { dropIndexFromClientY } from '@/lib/board-designer/strip-drag';
import { stripReorderAnnouncement } from '@/lib/board-designer/strip-reorder-announce';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

const ROW_H = 80;

function stubStripRects(container: HTMLElement, count: number) {
  const items = container.querySelectorAll<HTMLElement>('[data-strip-index]');
  expect(items.length).toBe(count);
  items.forEach((el, i) => {
    el.getBoundingClientRect = () =>
      ({
        top: i * ROW_H,
        bottom: (i + 1) * ROW_H,
        height: ROW_H,
        left: 0,
        right: 200,
        width: 200,
        x: 0,
        y: i * ROW_H,
        toJSON() {
          return {};
        },
      }) as DOMRect;
  });
}

function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientY: number,
  pointerId = 1,
) {
  const EventCtor = window.PointerEvent ?? window.MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    clientY,
    button: 0,
    pointerId,
  } as PointerEventInit);
  el.dispatchEvent(event);
}

function DragHarness({ initial }: { initial: BoardDesignConfig }) {
  const [history, dispatch] = useReducer(historyReducer, initial, createHistoryState);
  const strips = history.present.panels[0]!.strips;

  return (
    <div
      data-testid="harness"
      data-past={String(history.past.length)}
      data-can-undo={canUndo(history) ? '1' : '0'}
    >
      <ol data-testid="order" aria-label="order">
        {strips.map((s) => (
          <li key={s.id}>{s.id}</li>
        ))}
      </ol>
      <StripList
        grain="edge"
        strips={strips}
        panelThicknessIn={1.5}
        onAdd={() => dispatch({ type: 'add-strip', panelId: 'panel-1' })}
        onDuplicate={(id) => dispatch({ type: 'duplicate-strip', panelId: 'panel-1', id })}
        onDelete={(id) => dispatch({ type: 'delete-strip', panelId: 'panel-1', id })}
        onMove={(id, direction) =>
          dispatch({ type: 'move-strip', panelId: 'panel-1', id, direction })
        }
        onReorder={(fromIndex, toIndex) =>
          dispatch({
            type: 'reorder-strip',
            panelId: 'panel-1',
            fromIndex,
            toIndex,
          })
        }
        onUpdate={(id, patch) =>
          dispatch({ type: 'update-strip', panelId: 'panel-1', id, patch })
        }
        onCommitCoalesce={() => dispatch({ type: 'commit-coalesce' })}
      />
      <button type="button" onClick={() => dispatch({ type: 'undo' })}>
        Undo
      </button>
    </div>
  );
}

const threeStripConfig = makeV2Config({
  grain: 'edge',
  panels: [
    makePanel('panel-1', 'Panel 1', 1.5, [
      makeStrip('s1', 'hard-maple'),
      makeStrip('s2', 'walnut'),
      makeStrip('s3', 'cherry'),
    ]),
  ],
  rowPattern: [{ panelId: 'panel-1', transform: 'none' }],
  rowCount: 1,
});

describe('dropIndexFromClientY', () => {
  const rects = [
    { top: 0, height: 80 },
    { top: 80, height: 80 },
    { top: 160, height: 80 },
  ];

  it('maps Y to the strip whose mid-line the pointer is above', () => {
    expect(dropIndexFromClientY(10, rects, 0)).toBe(0);
    expect(dropIndexFromClientY(90, rects, 0)).toBe(1);
    expect(dropIndexFromClientY(200, rects, 0)).toBe(2);
  });
});

describe('StripList pointer drag → history', () => {
  beforeEach(() => {
    // jsdom often lacks PointerEvent / setPointerCapture.
    if (typeof window.PointerEvent === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).PointerEvent = window.MouseEvent;
    }
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  function orderIds(): string[] {
    return within(screen.getByTestId('order'))
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
  }

  function dragHandle(index: number): HTMLElement {
    const handles = screen.getAllByRole('button', { hidden: true }).filter((b) =>
      b.textContent?.includes('⋮'),
    );
    const handle = handles[index];
    expect(handle).toBeTruthy();
    return handle!;
  }

  it('pointerdown → moves → pointerup reorders strips with exactly one history entry', async () => {
    const { container } = render(<DragHarness initial={threeStripConfig} />);
    stubStripRects(container, 3);
    expect(orderIds()).toEqual(['s1', 's2', 's3']);

    const handle = dragHandle(0);
    await act(async () => {
      firePointer(handle, 'pointerdown', 20); // strip 0
      firePointer(handle, 'pointermove', 100); // over strip 1
      firePointer(handle, 'pointermove', 180); // over strip 2
      firePointer(handle, 'pointerup', 180);
    });
    // Live-region clear/set uses queueMicrotask.
    await act(async () => {
      await Promise.resolve();
    });

    expect(orderIds()).toEqual(['s2', 's3', 's1']);
    expect(screen.getByTestId('harness').getAttribute('data-past')).toBe('1');
    expect(screen.getByTestId('harness').getAttribute('data-can-undo')).toBe('1');

    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('Strip 1 moved to position 3 of 3');

    await act(async () => {
      screen.getByText('Undo').click();
    });
    expect(orderIds()).toEqual(['s1', 's2', 's3']);
    expect(screen.getByTestId('harness').getAttribute('data-can-undo')).toBe('0');
  });

  it('drag that ends on the same index is a no-op: no reorder, no history, no announce', async () => {
    const { container } = render(<DragHarness initial={threeStripConfig} />);
    stubStripRects(container, 3);
    const handle = dragHandle(1);

    await act(async () => {
      firePointer(handle, 'pointerdown', 100);
      firePointer(handle, 'pointermove', 110); // still strip 1
      firePointer(handle, 'pointerup', 100);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(orderIds()).toEqual(['s1', 's2', 's3']);
    expect(screen.getByTestId('harness').getAttribute('data-past')).toBe('0');
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent ?? '').toBe('');
  });

  it('announcement shape matches the arrow path helper', () => {
    const strip: Strip = { ...makeStrip('s1', 'hard-maple'), label: 'Maple rail' };
    expect(stripReorderAnnouncement(strip, 0, 2, 3)).toBe(
      'Maple rail moved to position 3 of 3',
    );
  });

  it('renders compact label rows and only one selected detail panel', () => {
    render(<DragHarness initial={threeStripConfig} />);

    const labelInputs = screen.getAllByLabelText('Strip label');
    expect(labelInputs).toHaveLength(3);
    expect(screen.getByLabelText('Selected strip details for Strip 1')).toBeTruthy();
    expect(screen.getAllByText('Species')).toHaveLength(1);
    expect(screen.getAllByText('Width (in)')).toHaveLength(1);
    expect(screen.getAllByText('Repeat (count)')).toHaveLength(1);
    expect(screen.getByText('Strip width in inches.')).toBeTruthy();
    expect(screen.getByText('Number of times this strip repeats.')).toBeTruthy();
    expect(screen.getByText('Mitered')).toBeTruthy();

    fireEvent.focus(labelInputs[1]!);
    expect(screen.getByLabelText('Selected strip details for Strip 2')).toBeTruthy();
  });
});
