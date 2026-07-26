import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)

/**
 * Catalog skeleton — shown while the force-dynamic catalog queries Postgres.
 *
 * Sprint 66: deliberately NOT a `<main>`. Route `loading.tsx` content is
 * streamed into a hidden React Suspense bag (`div#S:N`) and swapped in by
 * `$RC`. When that swap races / postpones (`$~`), the bag can survive beside
 * the real page — a second `<main id="main">` is a broken landmark. A plain
 * div keeps the shimmer without duplicating the document landmark.
 */
export default function CatalogLoading() {
  return (
    <div className={`${page} lg:max-w-none`}>
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
    </div>
  );
}
