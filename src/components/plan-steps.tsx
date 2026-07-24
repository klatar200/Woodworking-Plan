import Image from 'next/image';
import { Check } from 'lucide-react';
import { StepProse } from '@/components/prose';

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
 *
 * Step images (2026-07-24): optional `imageUrl` on each step (seeded from
 * content). Desktop = body left / image right; mobile = body then image.
 * Size capped in CSS so every plan shares one footprint.
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
  imageUrl?: string | null;
  tools: StepTool[];
  materials: StepMaterial[];
}

export interface PlanStepImage {
  url: string;
  alt: string;
}

export function PlanSteps({
  steps,
  images = [],
  ownedToolSlugs = [],
}: {
  steps: PlanStep[];
  /** Plan gallery — used only to resolve alt text for step.imageUrl. */
  images?: PlanStepImage[];
  /** Sprint 26 — slugs from the viewer's workshop; [] for anonymous. */
  ownedToolSlugs?: string[];
}) {
  const ownedSet = new Set(ownedToolSlugs);
  const altByUrl = new Map(images.map((img) => [img.url, img.alt]));

  return (
    <ol className="steps">
      {steps.map((step) => {
        const imageUrl = step.imageUrl ?? null;
        const imageAlt = imageUrl
          ? (altByUrl.get(imageUrl) ?? step.title)
          : null;

        return (
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
                            {owns ? (
                              <Check
                                size={12}
                                aria-hidden="true"
                                className="inline ml-[0.15rem] align-[-1px]"
                              />
                            ) : null}
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

            <div className="step-main">
              <StepProse text={step.body} />
              {imageUrl && imageAlt !== null ? (
                <figure className="step-image">
                  <Image
                    src={imageUrl}
                    alt={imageAlt}
                    width={320}
                    height={240}
                    sizes="(max-width: 63.99rem) 100vw, 320px"
                    className="step-image-img"
                  />
                </figure>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
