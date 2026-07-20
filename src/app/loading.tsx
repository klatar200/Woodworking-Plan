/**
 * QOL-M Step 1 (2026-07-20): the catalog skeleton moved to `browse/loading.tsx` with the
 * catalog. `/` is now an interim redirect to `/browse` (soon the landing page, Step 2), so
 * there is no catalog grid to skeleton here. A redirect resolves on the server, so this
 * renders nothing; Step 2 can add a landing-appropriate loading state if one is useful.
 */
export default function Loading() {
  return null;
}
