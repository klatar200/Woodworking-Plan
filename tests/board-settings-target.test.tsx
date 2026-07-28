/**
 * @vitest-environment jsdom
 *
 * Sprint 77 T4 — close the Sprint 76 coverage gap on targetDriftWarning and
 * prove target fields never patch the serialized config.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoardSettingsDisclosure,
  targetDriftWarning,
} from '@/components/designer/board-settings';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

afterEach(() => cleanup());

describe('targetDriftWarning (Sprint 77)', () => {
  const base = {
    lengthIn: 18,
    widthIn: 12,
    thicknessIn: 1.5,
  };

  it('ignores empty fields', () => {
    expect(
      targetDriftWarning({
        ...base,
        targetLength: '',
        targetWidth: '  ',
        targetThickness: '',
      }),
    ).toBeNull();
  });

  it('ignores non-numeric input', () => {
    expect(
      targetDriftWarning({
        ...base,
        targetLength: 'abc',
        targetWidth: '12',
        targetThickness: '1.5',
      }),
    ).toBeNull();
  });

  it('a difference inside 1/16″ does not warn (same tape mark)', () => {
    // 18 vs 18.03 → both round to 288 sixteenths.
    expect(
      targetDriftWarning({
        ...base,
        targetLength: '18.03',
        targetWidth: '12',
        targetThickness: '1.5',
      }),
    ).toBeNull();
  });

  it('a larger difference warns and names the drifted dimension(s)', () => {
    expect(
      targetDriftWarning({
        ...base,
        targetLength: '20',
        targetWidth: '12',
        targetThickness: '1.5',
      }),
    ).toBe('Computed size differs from target (length).');

    expect(
      targetDriftWarning({
        ...base,
        targetLength: '20',
        targetWidth: '10',
        targetThickness: '2',
      }),
    ).toBe('Computed size differs from target (length, width, thickness).');
  });
});

describe('BoardSettingsDisclosure — target fields are UI-only', () => {
  it('typing a target size leaves the serialized config byte-identical', () => {
    const config = makeV2Config({
      panels: [makePanel('panel-1', 'Panel 1', 1.5, [makeStrip('s1', 'walnut')])],
    });
    const metrics = calculateMetrics(config);
    const onChange = vi.fn();
    const before = JSON.stringify(config);

    render(
      <BoardSettingsDisclosure
        config={config}
        metrics={metrics}
        onChange={onChange}
        onGrainChange={vi.fn()}
        onCommitCoalesce={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Target length in inches'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText('Target width in inches'), {
      target: { value: '14' },
    });
    fireEvent.change(screen.getByLabelText('Target thickness in inches'), {
      target: { value: '2' },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(JSON.stringify(config)).toBe(before);
  });
});
