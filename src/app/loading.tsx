/**
 * Catalog skeleton — the mockup's shimmer cards, shown by Next.js while the
 * server component (a `force-dynamic` page that queries Postgres) renders.
 *
 * Static markup only, on purpose: a loading state that itself needs data or
 * JS to appear is a loading state that arrives late. Six slots matches the
 * mockup and roughly one desktop viewport of cards — enough to communicate
 * "the grid is coming" without a scrollbar full of ghosts.
 *
 * `aria-hidden` on the shimmer, plus one polite live-region sentence for
 * screen readers: rows of empty animated divs are meaningless to announce.
 */
export default function CatalogLoading() {
  return (
    <main id="main" className="page page-wide">
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
