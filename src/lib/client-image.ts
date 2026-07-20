/**
 * Client-side image downscale math — AUDIT FIX 2026-07-19.
 *
 * WHY THIS EXISTS: the server stores photos at a 1600px longest edge (MAX_STORED_EDGE
 * in src/lib/storage.ts), but the whole action body is capped at 4 MB
 * (next.config.ts, and ~4.5 MB by Vercel's platform regardless). A raw phone photo is
 * routinely 3–12 MB — so without a client-side downscale, most real photos either
 * fail at the framework layer or burn upload time carrying pixels the server is about
 * to throw away. Re-encoding to the stored size in the browser makes a typical photo
 * a few hundred KB.
 *
 * SECURITY: this changes NOTHING about the server pipeline. The server still treats
 * every byte as hostile — magic-byte detection, pixel caps, full re-encode, EXIF strip
 * (src/lib/storage.ts). This is a bandwidth/size optimisation, not a validation step;
 * a hand-built POST that skips it lands in the same server checks as before.
 *
 * Pure module — no DOM, no 'use client' — so the sizing rules are directly testable.
 * The canvas work lives in src/components/photo-input.tsx.
 */

/** Files at or under this size are sent as-is — a downscale would gain little. */
export const DOWNSCALE_THRESHOLD_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Longest edge of the downscaled image. MUST match MAX_STORED_EDGE in
 * src/lib/storage.ts — smaller loses quality the server would have kept; larger
 * uploads pixels the server resizes away.
 */
export const DOWNSCALE_MAX_EDGE = 1600;

/** JPEG quality for the client re-encode. The server re-encodes again to WebP. */
export const DOWNSCALE_QUALITY = 0.85;

/**
 * True when a file is worth downscaling: an image, and big enough to matter.
 * Non-images are left alone — the server rejects them with its own message, and a
 * canvas "conversion" of a non-image would only obscure that.
 */
export function shouldDownscale(file: { size: number; type: string }): boolean {
  return file.size > DOWNSCALE_THRESHOLD_BYTES && file.type.startsWith('image/');
}

/**
 * Fit (width × height) inside a maxEdge square, preserving aspect ratio, never
 * enlarging. Mirrors sharp's `fit: 'inside', withoutEnlargement: true`.
 */
export function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width, height };

  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
