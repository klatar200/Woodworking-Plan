'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** The server-rendered Instructions section (heading + StepWalker + steps). */
  children: React.ReactNode;
}

/**
 * "A button to open Instructions" — Sprint 20.
 *
 * On the redesigned desktop page the overview (image, glance, Tools/Materials/Cut List
 * tabs) comes first, and the step-by-step opens on demand — so someone comparing plans
 * isn't scrolling past forty build steps to get back to the catalog. This is that
 * button.
 *
 * PROGRESSIVE ENHANCEMENT, same contract as StepWalker and PlanTabs. `children` — the
 * complete Instructions section — is ALWAYS in the DOM. This component only collapses it
 * after mount and reveals it on click:
 *
 *   - NO-JS / crawler: the effect never runs, `collapsed` stays false, and the full
 *     instructions render open, exactly as before. The button is not shown (it does
 *     nothing without JS, and a dead button is worse than no button).
 *   - PRINT (Sprint 13): `@media print` forces the region visible with `!important`, so
 *     a plan printed while collapsed still prints every step. Toggling `hidden` alone
 *     would NOT survive print — `[hidden]` is overridable, but relying on that is
 *     fragile, so the print rule targets the region class directly.
 *   - OFFLINE: nothing fetched on open; the steps are already in the cached document.
 *
 * The content is collapsed by keeping it mounted and setting `hidden` — not by dropping
 * it from the tree — so the guarantee above holds and a crawler indexing the page sees
 * the whole plan.
 */
export function InstructionsDisclosure({ children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reveal = () => {
    setOpen(true);
    // Move focus into the newly revealed region for keyboard/screen-reader users —
    // otherwise the button vanishes and focus is left on nothing.
    requestAnimationFrame(() => {
      regionRef.current?.focus();
      regionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Before mount (and forever, with no JS) the instructions are simply open.
  const collapsed = mounted && !open;

  return (
    <div className="instructions-disclosure">
      {collapsed && (
        <button
          type="button"
          className="btn btn-primary instructions-open"
          aria-expanded={false}
          aria-controls="instructions-region"
          onClick={reveal}
        >
          Start building →
        </button>
      )}

      <div
        id="instructions-region"
        ref={regionRef}
        tabIndex={-1}
        className="instructions-region"
        hidden={collapsed}
      >
        {children}
      </div>
    </div>
  );
}
