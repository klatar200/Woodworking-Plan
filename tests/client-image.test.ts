import { describe, it, expect } from 'vitest';
import {
  shouldDownscale,
  scaledDimensions,
  DOWNSCALE_THRESHOLD_BYTES,
  DOWNSCALE_MAX_EDGE,
} from '@/lib/client-image';
import { MAX_STORED_EDGE } from '@/lib/storage';

/**
 * The client-side downscale sizing rules — AUDIT FIX 2026-07-19.
 *
 * These decide which photos get re-encoded in the browser before upload, and to what
 * size. The canvas work itself is untestable here (no real decoder in jsdom) and
 * fails soft by design; the MATH is what must be right, so the math is pure and
 * tested directly.
 */

describe('shouldDownscale', () => {
  it('leaves small files alone — a downscale would gain nothing', () => {
    expect(
      shouldDownscale({ size: DOWNSCALE_THRESHOLD_BYTES, type: 'image/jpeg' }),
    ).toBe(false);
  });

  it('downscales a big image', () => {
    expect(
      shouldDownscale({ size: DOWNSCALE_THRESHOLD_BYTES + 1, type: 'image/jpeg' }),
    ).toBe(true);
  });

  it('leaves NON-images alone — the server owns rejecting those, with its own message', () => {
    expect(
      shouldDownscale({ size: 50_000_000, type: 'application/octet-stream' }),
    ).toBe(false);
  });
});

describe('scaledDimensions', () => {
  it('fits inside the max edge, preserving aspect ratio', () => {
    // A 4032×3024 phone photo → longest edge 1600.
    expect(scaledDimensions(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    // Portrait orientation scales by height.
    expect(scaledDimensions(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never ENLARGES — mirrors sharp’s withoutEnlargement', () => {
    expect(scaledDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('never emits a zero dimension for an extreme aspect ratio', () => {
    expect(scaledDimensions(10_000, 1, 1600).height).toBeGreaterThanOrEqual(1);
  });

  it('passes degenerate input through rather than dividing by zero', () => {
    expect(scaledDimensions(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe('the client and server agree on the stored size', () => {
  it('DOWNSCALE_MAX_EDGE === MAX_STORED_EDGE — smaller loses quality the server keeps, larger uploads waste', () => {
    expect(DOWNSCALE_MAX_EDGE).toBe(MAX_STORED_EDGE);
  });
});
