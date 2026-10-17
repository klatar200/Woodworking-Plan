/**
 * @vitest-environment jsdom
 *
 * Sprint 82 — the 3D fallback speaks plainly, and a lost 3D context can be retried in place.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardPreview, previewFallbackReason } from '@/components/designer/board-preview';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { getTemplate } from '@/lib/board-designer/templates';

/** The 3D canvas, stubbed: it records how to report a lost context. */
let reportContextLost: (() => void) | null = null;
vi.mock('next/dynamic', () => ({
  default: () =>
    function StubCanvas(props: { onContextLost: () => void }) {
      reportContextLost = props.onContextLost;
      return <div data-testid="stub-canvas" />;
    },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  reportContextLost = null;
});

const TOO_MANY = 'Too many pieces for the 3D preview — showing the flat view.';
const LOST = 'The 3D preview stopped — showing the flat view.';
const UNAVAILABLE = "3D preview isn't available on this device — showing the flat view.";

function renderPreview() {
  const config = getTemplate('checkerboard')!.config;
  return render(<BoardPreview config={config} metrics={calculateMetrics(config)} />);
}

describe('previewFallbackReason', () => {
  it('words each case plainly, in precedence order', () => {
    expect(previewFallbackReason({ cellCount: 1_000_000, webglAvailable: false, contextLost: true })).toBe(TOO_MANY);
    expect(previewFallbackReason({ cellCount: 10, webglAvailable: false, contextLost: true })).toBe(LOST);
    expect(previewFallbackReason({ cellCount: 10, webglAvailable: false, contextLost: false })).toBe(UNAVAILABLE);
    expect(previewFallbackReason({ cellCount: 10, webglAvailable: true, contextLost: false })).toBeNull();
    expect(previewFallbackReason({ cellCount: 10, webglAvailable: null, contextLost: false })).toBeNull();
  });
});

describe('BoardPreview fallback', () => {
  it('without WebGL says so, with no retry button', () => {
    renderPreview();
    expect(screen.getByText(UNAVAILABLE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try 3D again' })).toBeNull();
  });

  it('a lost context offers "Try 3D again", which brings the 3D view back', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
    renderPreview();
    expect(screen.getByTestId('stub-canvas')).toBeTruthy();
    expect(reportContextLost).not.toBeNull();

    act(() => reportContextLost!());
    expect(screen.getByText(LOST)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try 3D again' }));
    expect(screen.queryByText(LOST)).toBeNull();
    expect(screen.getByTestId('stub-canvas')).toBeTruthy();
  });
});
