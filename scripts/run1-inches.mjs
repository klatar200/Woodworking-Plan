/**
 * Tape-measure formatting, in its own module to break an import cycle.
 *
 * `inches()` used to live in `run1-cut-step.mjs`. When `run1-apply-patch.mjs` began
 * consulting the box-geometry solver to route verification, that produced a cycle:
 * apply-patch -> box-geometry -> cut-step -> verify-packet -> apply-patch. ESM tolerates
 * cycles when every use is deferred to call time, which was true here — so it would have
 * worked, right up until someone moved a call to module scope and got an undefined
 * binding with no obvious cause.
 *
 * A four-module cycle held together by "nobody calls this during evaluation" is not worth
 * the two lines it saves. This module imports nothing.
 */
export function inches(v) {
  const whole = Math.floor(v + 1e-9);
  const sixteenths = Math.round((v - whole) * 16);
  if (sixteenths === 0) return `${whole}"`;
  if (sixteenths === 16) return `${whole + 1}"`;
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(sixteenths, 16);
  const frac = `${sixteenths / d}/${16 / d}`;
  return whole > 0 ? `${whole}-${frac}"` : `${frac}"`;
}
