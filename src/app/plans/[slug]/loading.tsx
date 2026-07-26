/**
 * Plan-detail skeleton — meta-chip row, title block, text lines, image slot.
 *
 * Sprint 66: not a `<main>` — see browse/loading.tsx (orphaned Suspense bags
 * must not duplicate the document landmark).
 */
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)

export default function PlanLoading() {
  return (
    <div className={`${page} page-wide plan-detail`}>
      <p className="visually-hidden" role="status">
        Loading plan…
      </p>

      <div aria-hidden="true">
        <div className="skel skel-line" style={{ width: '6rem' }} />
        <div className="skel-chip-row">
          <div className="skel skel-chip" />
          <div className="skel skel-chip" />
          <div className="skel skel-chip" />
        </div>
        <div className="skel skel-line skel-line-xl" style={{ width: '55%' }} />
        <div className="skel skel-line" style={{ width: '90%' }} />
        <div className="skel skel-line" style={{ width: '95%' }} />
        <div className="skel skel-line" style={{ width: '60%' }} />
        <div className="skel skel-photo skel-photo-detail" />
      </div>
    </div>
  );
}
