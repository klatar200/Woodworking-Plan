'use client';

import { useEffect, useRef, useState } from 'react';
import { btnGhost, btnPrimary } from '@/lib/ui'; // Sprint 29: shared button classes

// Sprint 30c: the step-walker chrome (rail, dots, progress bar, nav, finish CTA) →
// Tailwind. Active-state colors live per variant (source-order gotcha); the rail
// button uses `[font-family:inherit]` + `text-[…]` rather than the `font:inherit`
// shorthand so the size isn't reset after it.
const railItemBase =
  'flex items-center gap-[0.5625rem] w-full px-[0.5rem] py-[0.4375rem] border-none rounded-[0.375rem] bg-transparent [font-family:inherit] text-[0.875rem] text-fg text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';
const railItem = railItemBase;
const railItemActive = `${railItemBase} bg-accent-tint font-bold`;
const railNumBase =
  'flex-[0_0_auto] inline-flex items-center justify-center w-[1.5rem] h-[1.5rem] border border-fg rounded-[50%] text-[0.75rem] font-bold';
const railNum = `${railNumBase} bg-surface`;
const railNumActive = `${railNumBase} bg-fg text-surface`;
const dotBase =
  'w-[2rem] h-[2rem] flex-none border border-fg rounded-[50%] text-[0.8125rem] font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';
const dot = `${dotBase} bg-surface text-fg`;
const dotActive = `${dotBase} bg-fg text-surface`;
// The chrome classes (step-rail/step-dots/step-walker-bar/-nav/step-finish-cta) are
// RETAINED alongside the utilities — the print stylesheet hides them by class so paper
// shows the full step list, not the interactive walker.
const finishCta =
  'step-finish-cta block mt-[1.5rem] px-[1.25rem] py-[1rem] border border-accent-tint-border rounded-[0.5rem] bg-accent-tint text-fg no-underline hover:border-accent-strong focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

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
    <div ref={containerRef} className="flex items-start gap-[1.5rem]">
      {enhanced && (
        <nav
          className="step-rail hidden lg:flex flex-[0_0_14rem] flex-col gap-[0.1875rem] border-r border-border pr-[1rem]"
          aria-label="All steps"
        >
          <span className="text-[0.75rem] font-bold uppercase tracking-[0.04em] text-muted-2 mb-[0.5rem]">
            All steps
          </span>
          {stepTitles.map((title, i) => {
            const n = i + 1;
            const isActive = active === n;
            return (
              <button
                key={n}
                type="button"
                className={isActive ? railItemActive : railItem}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => goTo(n)}
              >
                <span className={isActive ? railNumActive : railNum}>{n}</span>
                <span>{title}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex-1 min-w-0">
        {enhanced && (
          <>
            <div className="step-walker-bar flex items-center gap-[0.75rem] mb-[1rem]">
              <div className="flex-1 max-w-[26rem] h-[0.75rem] border border-fg rounded-[999px] overflow-hidden">
                <div
                  className="h-full bg-accent-strong"
                  style={{ width: `${(active / totalSteps) * 100}%` }}
                />
              </div>
              <span className="font-bold text-[0.875rem] whitespace-nowrap">
                Step {active} of {totalSteps}
              </span>
            </div>

            <div
              className="step-dots flex flex-wrap gap-[0.5rem] mb-[1.25rem] lg:hidden"
              role="group"
              aria-label="Jump to step"
            >
              {stepTitles.map((title, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    type="button"
                    className={active === n ? dotActive : dot}
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
          <a href={reviewCtaHref} className={finishCta}>
            <strong>Built it?</strong> Share your build and leave a review →
          </a>
        )}

        {enhanced && (
          <div className="step-walker-nav flex gap-[0.75rem] mt-[1.5rem]">
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
