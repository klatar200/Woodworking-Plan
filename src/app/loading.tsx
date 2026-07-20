/**
 * QOL-M (2026-07-20): the catalog skeleton moved to `browse/loading.tsx` with the catalog.
 * `/` is now the marketing landing page — a server component whose only data is a small
 * `queryPlans({ perPage: 8 })` for the featured carousel, so it renders effectively
 * instantly and a skeleton would flash more than it helps. Intentionally renders nothing.
 */
export default function Loading() {
  return null;
}
