'use client';

import { useEffect, useRef, useState } from 'react';
import { nextTabIndex } from '@/lib/tab-nav';

// Sprint 30a (UI migration, wave 2): tab chrome → Tailwind. The `plan-tabs` and
// `plan-tablist` CLASSES are RETAINED — the print stylesheet and the sibling selector
// `.plan-tabs .plan-tablist ~ [data-tab] > h2` (which visually-hides a panel's redundant
// heading when enhanced) both target them by class. `font-medium!` is important so it
// beats the `[font:inherit]` reset regardless of Tailwind's fixed source order; border
// color lives per state, not in a shared base (the source-order gotcha from ui.ts).
// QOL-F (2026-07-19): the tab switch gets a colour transition so the change reads as a
// movement rather than a jump-cut. The mockup proposed a SLIDING UNDERLINE; that is not
// what shipped, and deliberately — these are FOLDER tabs (a bordered tab that joins its
// panel by hiding the shared edge), not underlined ones. Bolting an underline onto them
// would be a redesign of the tab treatment rather than the motion pass Keagan approved,
// and it would need JS measurement inside a component with a documented WAI-ARIA keyboard
// contract. Same intent — make the change legible — at none of the risk.
const tabShared =
  'appearance-none rounded-t-[0.375rem] px-[1rem] py-[0.625rem] min-h-[2.75rem] [font:inherit] font-medium! cursor-pointer mb-[-1px] transition-[color,background-color,border-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-[-2px]';
const tabClass = `${tabShared} bg-transparent border border-b-0 border-transparent text-muted hover:text-fg`;
const tabActiveClass = `${tabShared} border text-fg bg-surface border-border border-b border-b-surface`;
const tablistClass =
  'plan-tablist flex gap-[0.25rem] border-b border-border mt-[1.5rem] mx-0 mb-0';

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

  // One panel (or none) is not a tab strip — render the sections as-is. A single tab
  // above a single panel is chrome with no purpose. (Declared before the effect below,
  // which now gates the tabpanel roles on it.)
  const enhanced = mounted && shown.length > 1;

  useEffect(() => {
    if (!mounted) return;
    const panels = ref.current?.querySelectorAll<HTMLElement>('[data-tab]');
    panels?.forEach((el) => {
      if (!enhanced) {
        // Sprint 36 (audit polish): with no tablist rendered (single panel, or pre-mount),
        // a server-rendered `role="tabpanel"` + `aria-labelledby="tab-x"` points at a tab
        // that does not exist — an ARIA orphan. So the panels ship with NO roles, and the
        // roles are added HERE only when enhanced; stripped (and the panel shown) otherwise.
        el.removeAttribute('role');
        el.removeAttribute('aria-labelledby');
        el.removeAttribute('tabindex');
        el.style.display = '';
        return;
      }
      const isActive = el.dataset.tab === active;
      el.setAttribute('role', 'tabpanel');
      el.setAttribute('aria-labelledby', `tab-${el.dataset.tab}`);
      el.style.display = isActive ? '' : 'none';
      // The active panel is focusable so keyboard users can read its content; hidden
      // panels (display:none) leave the a11y tree entirely, so no tabindex is needed.
      if (isActive) el.setAttribute('tabindex', '0');
      else el.removeAttribute('tabindex');
    });
  }, [active, mounted, enhanced]);

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
        <div className={tablistClass} role="tablist" aria-label="Plan details">
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
                className={isActive ? tabActiveClass : tabClass}
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
