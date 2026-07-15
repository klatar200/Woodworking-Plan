'use client';

import { useEffect, useRef, useState } from 'react';
import { nextTabIndex } from '@/lib/tab-nav';

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
 *   - PRINT (Sprint 13): `@media print` forces `.plan-tabs [data-tab]` visible, so paper
 *     shows all three regardless of which tab was active. A cut list you can't print is
 *     the one failure this section cannot have.
 *   - OFFLINE (Sprint 8/14): the cached page already contains every panel; switching
 *     tabs is never a network request.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * KEYBOARD (Sprint 24 hardening). A `role="tablist"` is a PROMISE to assistive tech that
 * arrow keys move between tabs and only the active tab is in the tab order — the WAI-ARIA
 * tab pattern. Sprint 20 shipped the roles without that behaviour, which is a keyboard
 * trap of a subtler kind: a screen reader announces "tab, 1 of 3" and then the arrows do
 * nothing. This implements it properly:
 *   - ROVING TABINDEX: the active tab is `tabIndex 0`, the rest `-1`, so Tab reaches the
 *     tablist once and lands on the current tab.
 *   - ← / → move (and wrap), Home / End jump to first / last; activation is automatic
 *     (focus a tab and it shows its panel — cheap here, it's just show/hide).
 *   - The visible panel gets `tabIndex 0` so a keyboard user can reach its (mostly
 *     non-interactive) content after the tab, per the pattern.
 * ═══════════════════════════════════════════════════════════════════════════════════
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
      const isActive = el.dataset.tab === active;
      el.style.display = isActive ? '' : 'none';
      // The active panel is focusable so keyboard users can read its content; hidden
      // panels (display:none) leave the a11y tree entirely, so no tabindex is needed.
      if (isActive) el.setAttribute('tabindex', '0');
      else el.removeAttribute('tabindex');
    });
  }, [active, mounted]);

  // One panel (or none) is not a tab strip — render the sections as-is. A single tab
  // above a single panel is chrome with no purpose.
  const enhanced = mounted && shown.length > 1;

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const next = nextTabIndex(event.key, index, shown.length);
    if (next === null) return;
    event.preventDefault();
    const nextTab = shown[next]!;
    setActive(nextTab.id);
    // Move focus to the newly active tab — the roving-tabindex requirement.
    ref.current?.querySelector<HTMLButtonElement>(`#tab-${nextTab.id}`)?.focus();
  }

  return (
    <div ref={ref} className="plan-tabs">
      {enhanced && (
        <div className="plan-tablist" role="tablist" aria-label="Plan details">
          {shown.map((tab, index) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`plan-tab${isActive ? ' plan-tab-active' : ''}`}
                onClick={() => setActive(tab.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {children}
    </div>
  );
}
