/**
 * FormData readers for server actions — 2026-07-19.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS: A SERVER ACTION MUST NOT THROW.
 *
 * Four action files each carried a private copy of this helper, and every copy
 * THREW on a missing field:
 *
 *     function requiredString(formData, key) {
 *       const value = formData.get(key);
 *       if (typeof value !== 'string' || value === '') throw new Error(`Missing ${key}`);
 *       return value;
 *     }
 *
 * An uncaught throw out of a server action is an unhandled server exception — HTTP 500
 * and a client-side "Application error" boundary. That is not hypothetical: it is the
 * exact shape of the rate-limiter incident (`src/lib/rate-limit.ts`), where a limiter
 * that "worked" also crashed the page. The rule that came out of it — **a request is
 * DROPPED, never thrown** — was applied to the limiter and then not to the field
 * readers sitting directly beneath it.
 *
 * A server action is a PUBLIC HTTP ENDPOINT. Anyone can POST anything to it, including
 * nothing at all. So a missing or malformed field is ordinary untrusted input, not an
 * exceptional condition, and it gets the same treatment as every other piece of
 * untrusted input in this codebase: it degrades. These readers return `null`; the
 * caller redirects.
 *
 * ONE COPY, not four. The duplication is how three of the four files kept a defect
 * after the fourth was noticed.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pure — no `next` imports, no 'use server' — so it is directly testable.
 */

/**
 * A non-empty string field, or `null`.
 *
 * `FormData.get` returns `string | File | null`. A `File` where a string was expected
 * means someone hand-built the request; it is not a string and is rejected as such
 * rather than being stringified into `"[object File]"` and passed to a database query.
 */
export function formString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * An integer field inside an inclusive range, or `null`.
 *
 * Bounds are REQUIRED, not optional. Every integer this app reads from a form has a
 * meaningful range (a rating is 1–5), and an unbounded parse is how `NaN`, `-1` and
 * `1e9` reach the data layer. `Number.parseInt` is deliberately not used on its own:
 * it happily reads `"5abc"` as `5` and `"1e9"` as `1`, so the string is required to be
 * an integer in its entirety.
 */
export function formInt(
  formData: FormData,
  key: string,
  min: number,
  max: number,
): number | null {
  const raw = formString(formData, key);
  if (raw === null) return null;
  if (!/^-?\d+$/.test(raw)) return null;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) return null;

  return value;
}
