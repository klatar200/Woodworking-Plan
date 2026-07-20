/**
 * Catalog skeleton — the mockup's shimmer cards, shown by Next.js while the
 * server component (a `force-dynamic` page that queries Postgres) renders.
 *
 * QOL-M (2026-07-20): moved here with the catalog when it went from `/` to `/browse`.
 *
 * Static markup only, on purpose: a loading state that itself needs data or
 * JS to appear is a loading state that arrives late. Six slots matches the
 * mockup and roughly one desktop viewport of cards — enough to communicate
 * "the grid is coming" without a scrollbar full of ghosts.
 *
 * `aria-hidden` on the shimmer, plus one polite live-region sentence for
 * screen readers: rows of empty animated divs are meaningless to announce.
 */
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)

export default function CatalogLoading() {
  return (
    // Same shell width as the loaded catalog (browse/page.tsx: full-width at lg,
    // 2026-07-16) — a skeleton narrower than the page it stands in for makes
    // the whole layout visibly jump when the data lands.
    <main id="main" className={`${page} lg:max-w-none`}>
      <h1>Plans</h1>
      <p className="visually-hidden" role="status">
        Loading plans…
      </p>

      <div aria-hidden="true">
        <div className="skel skel-bar" />
        <ul className="plan-grid skel-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skel-card">
              <div className="skel skel-photo" />
              <div className="skel-card-body">
                <div className="skel skel-line" style={{ width: '50%' }} />
                <div className="skel skel-line skel-line-lg" style={{ width: '80%' }} />
                <div className="skel skel-line" style={{ width: '60%' }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
