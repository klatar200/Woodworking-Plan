'use client';

import { useEffect, useRef, useState } from 'react';

interface Tab {
  /** Stable key, also the panel's `data-tab` value. */
  id: string;
  label: string;
  /** Hidden when the tab has nothing to show (e.g. a plan with no cut list). */
  present: boolean;
}

interface Props {
  tabs: Tab[];
  /**
   * The server-rendered panels — one element per tab, each carrying
   * `data-tab={id}`. Untouched full content; this component only toggles which
   * one is visible.
   */
  children: React.ReactNode;
}

/**
 * Tools / Materials / Cut List as tabs — Sprint 20, the plan-detail redesign.
 *
 * PROGRESSIVE ENHANCEMENT, the same contract as StepWalker (step-walker.tsx) and for
 * the same reasons. `children` is the SAME three server-rendered `<section>`s the page
 * has always rendered — every tool, every material row, every cut-list dimension is in
 * the initial HTML. This component only HIDES panels via a `useEffect` after mount:
 *
 *   - NO-JS / crawler: nothing here runs, so all three sections render stacked, exactly
 *     as they did before this component existed.
 *   - PRINT (Sprint 13): `@media print` forces `.plan-tab-panel { display: block }`, so
 *     paper shows all three regardless of which tab was active on screen. A cut list you
 *     can't print is the one failure this section cannot have.
 *   - OFFLINE (Sprint 8/14): the cached page already contains every panel; switching
 *     tabs is never a network request.
 *
 * It toggles `element.style.display` on nodes found by `data-tab`, never re-rendering
 * that markup — so the content is never at the mercy of this component's own output.
 * (Note: this is why hiding is done by inline style and not by conditionally rendering
 * the panels — dropping them from the tree after mount would defeat print and no-JS.)
 */
export function PlanTabs({ tabs, children }: Props) {
  const shown = tabs.filter((t) => t.present);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(shown[0]?.id ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const panels = ref.current?.querySelectorAll<HTMLElement>('[data-tab]');
    panels?.forEach((el) => {
      el.style.display = el.dataset.tab === active ? '' : 'none';
    });
  }, [active, mounted]);

  // One panel (or none) is not a tab strip — render the sections as-is. A single tab
  // above a single panel is chrome with no purpose.
  const enhanced = mounted && shown.length > 1;

  return (
    <div ref={ref} className="plan-tabs">
      {enhanced && (
        <div className="plan-tablist" role="tablist" aria-label="Plan details">
          {shown.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`plan-tab${active === tab.id ? ' plan-tab-active' : ''}`}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
