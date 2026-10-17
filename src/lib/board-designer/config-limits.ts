/**
 * Posted-config byte budget for designer save actions.
 *
 * Derivation (Sprint 61): schema max is 4 panels × ≤40 strips (≤80 total), all
 * mitered, 24 rowPattern steps, rowCount 60, name 80 chars, UUID ids → measured
 * serialized size ≈ 14_893 bytes. Cap = 32 KiB (≥ measured × 1.25 headroom).
 * Raising a schema strip/panel/row cap ⇒ re-measure and revisit this number.
 */
export const MAX_CONFIG_BYTES = 32 * 1024;

/**
 * Strip caps, named for the editor (Sprint 81): the reducer and the UI stop at these so the
 * designer can never build a config the schema rejects. They mirror the limits written into
 * `serialize.ts`'s schema (`strips … .max(40)`, total ≤ 80) — change both together.
 */
export const MAX_STRIPS_PER_PANEL = 40;
export const MAX_STRIPS_TOTAL = 80;
