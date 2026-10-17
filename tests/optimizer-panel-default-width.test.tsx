/**
 * @vitest-environment jsdom
 *
 * Sprint 80 — the cut plan's default stock width follows the design on screen. A width captured
 * once at mount would keep Checkerboard's 3 1/2″ after loading Plaid and report Plaid's 9 15/16″
 * strip as too wide to rip.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cutPlanGroupsForConfig,
  OptimizerPanel,
} from '@/components/designer/optimizer-panel';
import { getTemplate } from '@/lib/board-designer/templates';

afterEach(() => cleanup());

describe('OptimizerPanel default stock width', () => {
  it('re-resolves when the design changes, until the user picks', () => {
    const checker = getTemplate('checkerboard')!.config;
    const plaid = getTemplate('plaid')!.config;

    const { container, rerender } = render(<OptimizerPanel config={checker} />);
    const widthSelect = () => container.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(widthSelect().value).toBe('3.5');

    rerender(<OptimizerPanel config={plaid} />);
    expect(widthSelect().value).toBe('11.25');
    expect(container.textContent).not.toContain('Wider than the');
  });

  it('an explicit "buy each part\'s width" choice still maps to rip-none', () => {
    const checker = getTemplate('checkerboard')!.config;
    const { container } = render(<OptimizerPanel config={checker} stockWidthIn={null} />);
    expect((container.querySelectorAll('select')[1] as HTMLSelectElement).value).toBe(
      'rip-none',
    );
  });

  it('…and actually packs that way: null buys each part at its own width, no ripping', () => {
    const checker = getTemplate('checkerboard')!.config;
    const explicit = cutPlanGroupsForConfig(checker, { stockWidthIn: null });
    for (const group of explicit) {
      expect(group.ripsPerBoard).toBe(1);
      expect(group.stockWidthIn).toBeCloseTo(group.widthIn, 9);
    }
    const auto = cutPlanGroupsForConfig(checker);
    expect(auto.every((group) => group.stockWidthIn === 3.5)).toBe(true);
  });
});
