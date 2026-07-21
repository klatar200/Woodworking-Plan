'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { btnGhost, btnPrimary } from '@/lib/ui'; // Sprint 29: shared button classes
import {
  clearStoredStep,
  readStoredStep,
  shouldScroll,
  stepToPersist,
  writeStoredStep,
} from '@/lib/step-progress';

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
  'w-[2.75rem] h-[2.75rem] flex-none border border-fg rounded-[50%] text-[0.8125rem] font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';
const dot = `${dotBase} bg-surface text-fg`;
const dotActive = `${dotBase} bg-fg text-surface`;
// The chrome classes (step-rail/step-dots/step-walker-bar/-nav/step-finish-cta) are
// RETAINED alongside the utilities — the print stylesheet hides them by class so paper
// shows the full step list, not the interactive walker.

/**
 * Sprint 38.3 (audit M3) — Prev/Next is pinned to the bottom of the viewport on a phone.
 *
 * The nav sits after content of wildly varying length, so today the single control you
 * press most often lands somewhere different on every step: you look for it, then reach
 * for it, with gloves on, mid-cut. Pinned, advancing becomes one eyes-free gesture at a
 * fixed position.
 *
 * `sticky`, not `fixed`: sticky keeps the bar in flow, so it un-pins into its natural
 * place at the end of the walker instead of floating over the footer forever, and it
 * needs no spacer element to avoid overlapping what follows.
 *
 * `-mx-[1.25rem] px-[1.25rem]` cancels then re-applies the page shell's gutter, so the
 * bar's surface reaches the screen edges (content scrolling through a 1.25rem gap either
 * side of a floating bar reads as a rendering bug). Exactly cancelling the padding means
 * no horizontal overflow.
 *
 * `pt-`/`pb-` rather than `py-`: `py-*` compiles to the `padding-block` SHORTHAND, and a
 * shorthand vs. the `pb-*` longhand is resolved by Tailwind's source order, not className
 * order — the standing migration gotcha. Two longhands cannot fight.
 *
 * At `lg:` every declaration is returned to its pre-sprint value, so the desktop layout
 * (where the rail is visible and the page is short) is unchanged by construction. Verified
 * by compiling this exact list with the repo's Tailwind v4.3.2 toolchain: the `lg:`
 * variants are emitted well after the unprefixed utilities, so `lg:static` does beat
 * `sticky` — the ordering that is NOT safe to assume.
 */
const stepNav =
  'step-walker-nav flex gap-[0.75rem] mt-[1.5rem] sticky bottom-0 z-20 -mx-[1.25rem] px-[1.25rem] pt-[0.75rem] pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-border bg-surface lg:static lg:z-auto lg:mx-0 lg:px-0 lg:pt-0 lg:pb-0 lg:border-t-0 lg:bg-transparent';

const finishCta =
  'step-finish-cta block mt-[1.5rem] px-[1.25rem] py-[1rem] border border-accent-tint-border rounded-[0.5rem] bg-accent-tint text-fg no-underline hover:border-accent-strong focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

interface Props {
  stepTitles: string[];
  /**
   * Sprint 38.1 — the plan this walker is for, used only as the localStorage key. It is a
   * key, never a lookup: nothing here queries by slug, so a wrong one loses your place
   * rather than showing you someone else's plan.
   */
  slug: string;
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
export function StepWalker({ stepTitles, slug, children, reviewCtaHref }: Props) {
  const totalSteps = stepTitles.length;
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  /** Last rendered step, so the scroll below fires on a CHANGE and not on mount. */
  const previousActive = useRef<number | null>(null);

  /**
   * Only after mount do we start hiding anything — see the file doc above.
   *
   * Sprint 38.1: the remembered step is restored in this SAME effect, on purpose. The
   * server-rendered document already contains every step and hides nothing, so there is
   * no window in which the reader sees "step 1" and then watches it change: the walker's
   * step-1-only view and the restored step arrive in the same commit, and a visitor
   * without JS reaches neither.
   */
  useEffect(() => {
    setActive(readStoredStep(slug, totalSteps));
    setMounted(true);
  }, [slug, totalSteps]);

  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    container?.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
      el.style.display = Number(el.dataset.step) === active ? '' : 'none';
    });

    // 38.1 — remember, or forget once the build is finished. See stepToPersist.
    const persist = stepToPersist(active, totalSteps);
    if (persist === null) clearStoredStep(slug);
    else writeStoredStep(slug, persist);

    // 38.2 — show the reader the step they just asked for.
    const previous = previousActive.current;
    previousActive.current = active;
    // Never on mount/restore: the page is at its own scroll offset for reasons that have
    // nothing to do with a step change, and moving it would be the yank this guards.
    if (previous === null || previous === active) return;
    const target = container?.querySelector<HTMLElement>(`[data-step="${active}"]`);
    if (!container || !target) return;
    if (!shouldScroll(container.getBoundingClientRect().top, window.innerHeight)) return;
    // WCAG 2.3.3 — read at call time rather than at mount, so changing the OS setting
    // takes effect without a reload.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [active, mounted, slug, totalSteps]);

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

      {/* 38.3 — the runway the sticky bar needs. Without it the bar can pin over the
          finish CTA with nothing left to scroll, so the CTA would never come free of it.
          Only when enhanced (no bar, no gap) and only below `lg` (no bar there either). */}
      <div className={`flex-1 min-w-0${enhanced ? ' pb-[4.5rem] lg:pb-0' : ''}`}>
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
          <div className={stepNav}>
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
              {active === totalSteps ? (
                <span className="inline-flex items-center gap-[0.35rem]">
                  Finish <Check size={15} aria-hidden="true" />
                </span>
              ) : (
                'Next →'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
