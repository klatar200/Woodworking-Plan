/**
 * Posted-config byte budget for designer save actions.
 *
 * Derivation (Sprint 61): schema max is 4 panels × ≤40 strips (≤80 total), all
 * mitered, 24 rowPattern steps, rowCount 60, name 80 chars, UUID ids → measured
 * serialized size ≈ 14_893 bytes. Cap = 32 KiB (≥ measured × 1.25 headroom).
 * Raising a schema strip/panel/row cap ⇒ re-measure and revisit this number.
 */
export const MAX_CONFIG_BYTES = 32 * 1024;
