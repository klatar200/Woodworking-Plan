/**
 * Plan-detail skeleton — mirrors the mockup's loading state for the step
 * view: meta-chip row, title block, a few text lines, and an image slot.
 *
 * Same rules as the catalog skeleton (src/app/loading.tsx): static markup,
 * shimmer hidden from assistive tech, one polite live-region sentence.
 */
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)

export default function PlanLoading() {
  return (
    // `plan-detail` matches the loaded page's shell (84rem at lg, 2026-07-16)
    // so the layout doesn't jump when the data lands.
    <main id="main" className={`${page} page-wide plan-detail`}>
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
    </main>
  );
}
