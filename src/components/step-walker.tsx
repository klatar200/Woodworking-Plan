'use client';

import { useEffect, useRef, useState } from 'react';
import { btnGhost, btnPrimary } from '@/lib/ui'; // Sprint 29: shared button classes

interface Props {
  stepTitles: string[];
  /** The server-rendered `<ol className="steps">` — untouched, full content. */
  children: React.ReactNode;
  /**
   * Sprint 20 — where the "you finished, share your build" CTA points. Almost always
   * `#reviews-heading` on the same page. Optional: a plan page without a reviews
   * section (there isn't one today, but the component shouldn't assume) simply gets no
   * CTA. The CTA is an ENHANCEMENT on top of an enhancement — it only appears once JS
   * has taken over the step list — so it never affects print, offline, or no-JS.
   */
  reviewCtaHref?: string;
}

/**
 * Step-by-step navigator — the mockup's progress bar + step rail/dots +
 * Prev/Next, layered on top of the plan detail page's Instructions section.
 *
 * PROGRESSIVE ENHANCEMENT, not a rebuild. `children` is the SAME
 * server-rendered `<ol className="steps">` the page has always rendered —
 * every step's full text is still in the initial HTML. This component only
 * ever HIDES steps via a `useEffect` that runs after mount; if JavaScript
 * never loads, nothing here executes and the page reads exactly as it did
 * before this component existed: every step, one after another, in one
 * document.
 *
 * That matters for three things this app already promises elsewhere and
 * must not break here:
 *   - PRINT (Sprint 13): `.step { display: block !important }` inside
 *     `@media print` in globals.css forces every step visible on paper
 *     regardless of which one was "active" on screen.
 *   - OFFLINE (Sprint 8/14): the cached page already contains every step;
 *     there is no second network request per step to go fetch.
 *   - NO-JS / accessibility: a user or crawler without JS gets the complete
 *     plan, not a stub that depends on script execution to reveal content.
 *
 * Each `<li className="step">` in `children` must carry `data-step={n}`
 * (1-indexed) — see src/app/plans/[slug]/page.tsx. This component never
 * re-renders that markup; it only toggles `element.style.display` on the
 * nodes it finds by that attribute, which is why the underlying content is
 * never at the mercy of this component's own render output.
 */
export function StepWalker({ stepTitles, children, reviewCtaHref }: Props) {
  const totalSteps = stepTitles.length;
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only after mount do we start hiding anything — see the file doc above.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const steps = containerRef.current?.querySelectorAll<HTMLElement>('[data-step]');
    steps?.forEach((el) => {
      el.style.display = Number(el.dataset.step) === active ? '' : 'none';
    });
  }, [active, mounted]);

  const goTo = (n: number) => setActive(Math.min(totalSteps, Math.max(1, n)));

  // A one-step plan has nothing to walk through — render the list as-is.
  if (totalSteps <= 1) {
    return <>{children}</>;
  }

  const enhanced = mounted;

  return (
    <div ref={containerRef} className="step-walker">
      {enhanced && (
        <nav className="step-rail" aria-label="All steps">
          <span className="step-rail-heading">All steps</span>
          {stepTitles.map((title, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                type="button"
                className={`step-rail-item${active === n ? ' step-rail-item-active' : ''}`}
                aria-current={active === n ? 'step' : undefined}
                onClick={() => goTo(n)}
              >
                <span className="step-rail-number">{n}</span>
                <span className="step-rail-title">{title}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="step-walker-main">
        {enhanced && (
          <>
            <div className="step-walker-bar">
              <div className="step-walker-progress-track">
                <div
                  className="step-walker-progress-fill"
                  style={{ width: `${(active / totalSteps) * 100}%` }}
                />
              </div>
              <span className="step-walker-position">
                Step {active} of {totalSteps}
              </span>
            </div>

            <div className="step-dots" role="group" aria-label="Jump to step">
              {stepTitles.map((title, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    type="button"
                    className={`step-dot${active === n ? ' step-dot-active' : ''}`}
                    aria-label={`Step ${n}: ${title}`}
                    aria-current={active === n ? 'step' : undefined}
                    onClick={() => goTo(n)}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {children}

        {/* Sprint 20 — the last-step CTA. When the builder reaches the final step,
            invite the review + build photo. Only on the last step, only when enhanced,
            and only if a target was given — so it never shows on paper or without JS,
            where there is no "current step" to be last on. */}
        {enhanced && reviewCtaHref && active === totalSteps && (
          <a href={reviewCtaHref} className="step-finish-cta">
            <strong>Built it?</strong> Share your build and leave a review →
          </a>
        )}

        {enhanced && (
          <div className="step-walker-nav">
            <button
              type="button"
              className={btnGhost}
              disabled={active === 1}
              onClick={() => goTo(active - 1)}
            >
              &larr; Prev
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={active === totalSteps}
              onClick={() => goTo(active + 1)}
            >
              {active === totalSteps ? 'Finish ✓' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
