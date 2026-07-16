import { Prose } from '@/components/prose';

/**
 * The server-rendered step list — extracted 2026-07-16 when "Start building"
 * became a dedicated page (Keagan's direction).
 *
 * This exact markup used to live inline in plans/[slug]/page.tsx. It now
 * renders in TWO places — the plan page (the no-JS / print / offline fallback)
 * and /plans/[slug]/build (the full-page walker) — and duplicating forty lines
 * of step/chip markup across them is how the two copies drift. One component,
 * two call sites.
 *
 * Contract unchanged from Sprints 3/20/21:
 *   - Every step is fully server-rendered; nothing here needs JS.
 *   - Each `<li className="step">` carries `data-step={n}` — StepWalker finds
 *     steps by that attribute and only ever toggles their inline display.
 *   - Per-step tool/material chips (Sprint 21) render nothing for an untagged
 *     step; owned tools (Sprint 26) get the ✓ highlight.
 *   - The `.step` / `.steps` classes stay — the print stylesheet forces every
 *     step visible by class, and `break-inside: avoid` rides on `.step`.
 */

interface StepTool {
  id: string;
  tool: { slug: string; name: string };
}

interface StepMaterial {
  id: string;
  material: { name: string };
}

export interface PlanStep {
  id: string;
  stepNumber: number;
  title: string;
  body: string;
  tools: StepTool[];
  materials: StepMaterial[];
}

export function PlanSteps({
  steps,
  ownedToolSlugs = [],
}: {
  steps: PlanStep[];
  /** Sprint 26 — slugs from the viewer's workshop; [] for anonymous. */
  ownedToolSlugs?: string[];
}) {
  const ownedSet = new Set(ownedToolSlugs);

  return (
    <ol className="steps">
      {steps.map((step) => (
        <li key={step.id} className="step" data-step={step.stepNumber}>
          <h3 className="step-title">
            <span className="step-number">{step.stepNumber}</span>
            {step.title}
          </h3>

          {/* Sprint 21 — what this step calls for, so a builder can gather it
              without reading ahead. Renders nothing for an untagged step. */}
          {(step.tools.length > 0 || step.materials.length > 0) && (
            <div className="step-needs">
              {step.tools.length > 0 && (
                <div className="step-needs-group">
                  <span className="step-needs-label">Tools</span>
                  <ul className="step-needs-list">
                    {step.tools.map((st) => {
                      // Sprint 26 — mark the ones you own, so a glance at a step
                      // tells you what you still need to fetch.
                      const owns = ownedSet.has(st.tool.slug);
                      return (
                        <li
                          key={st.id}
                          className={`step-need step-need-tool${owns ? ' step-need-owned' : ''}`}
                          title={owns ? 'In your workshop' : undefined}
                        >
                          {st.tool.name}
                          {owns ? <span aria-hidden="true"> ✓</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {step.materials.length > 0 && (
                <div className="step-needs-group">
                  <span className="step-needs-label">Materials</span>
                  <ul className="step-needs-list">
                    {step.materials.map((sm) => (
                      <li key={sm.id} className="step-need step-need-material">
                        {sm.material.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Prose text={step.body} />
        </li>
      ))}
    </ol>
  );
}
