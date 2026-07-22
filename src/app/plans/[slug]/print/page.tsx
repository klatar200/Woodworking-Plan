import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlanBySlug } from '@/lib/plans';
import { costTierSymbol, difficultyLabel, formatDimensions } from '@/lib/format';
import { SITE_HOST } from '@/lib/brand';
import { Prose } from '@/components/prose';

/**
 * Print view — Sprint 13. BUSINESS_PLAN.md §10 ("print-friendly / offline PDF export").
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A PAGE AND NOT A GENERATED PDF
 *
 * A server-generated PDF REQUIRES A NETWORK ROUND-TRIP TO PRODUCE. That makes it the
 * least offline-capable option available — in the one sprint whose entire purpose is a
 * plan you can use with no signal. It would be useless in exactly the workshop it was
 * built for.
 *
 * This is a PUBLIC route (covered by `/plans(.*)` in the allowlist), which means the
 * Sprint 8 service worker CACHES it like any other plan content. So:
 *
 *   - It opens in a workshop with no signal.
 *   - `Ctrl+P → Save as PDF` produces a better PDF than any library we'd ship.
 *   - It costs nothing on Vercel Hobby and adds nothing to the serverless bundle.
 *
 * (DECISIONS_LOG.md 2026-07-13.)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * TWO LAYOUTS, because they are two different jobs:
 *
 *   /plans/x/print              — the whole plan. For reading.
 *   /plans/x/print?view=cutlist — cut list + materials on ONE page. For taping to the
 *                                 wall by the saw. This is the sheet you look at every
 *                                 thirty seconds mid-build, and flipping to page 2 of 4
 *                                 with sawdust on your hands is not a thing anyone does.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ view?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);

  if (!plan) return { title: 'Plan not found' };

  return {
    title: `${plan.title} — print`,
    robots: { index: false, follow: false },
  };
}

export default async function PlanPrintPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { view } = await searchParams;

  const plan = await getPlanBySlug(slug);

  // Returns null for unknown AND unpublished slugs alike, so this 404 cannot be used
  // to probe for unreleased content — same as the detail page.
  if (!plan) notFound();

  const cutListOnly = view === 'cutlist';

  return (
    <main id="main" className="print-page">
      {/* On-screen controls. `no-print` strips them from the paper. */}
      <div className="print-controls no-print">
        <Link href={`/plans/${plan.slug}`}>← Back to the plan</Link>

        <nav aria-label="Print layout">
          <Link
            href={`/plans/${plan.slug}/print`}
            className={`chip ${!cutListOnly ? 'chip-active' : ''}`}
            aria-current={!cutListOnly ? 'page' : undefined}
          >
            Full plan
          </Link>
          <Link
            href={`/plans/${plan.slug}/print?view=cutlist`}
            className={`chip ${cutListOnly ? 'chip-active' : ''}`}
            aria-current={cutListOnly ? 'page' : undefined}
          >
            Cut list only
          </Link>
        </nav>

        <p className="muted small">
          Use your browser&apos;s Print (Ctrl/Cmd&nbsp;+&nbsp;P) and choose{' '}
          <strong>Save as PDF</strong>. This page works offline once you&apos;ve opened
          it with a signal.
        </p>
      </div>

      <header className="print-header">
        <h1>{plan.title}</h1>
        <p className="print-summary">{plan.summary}</p>

        <dl className="print-glance">
          <div>
            <dt>Difficulty</dt>
            {/* QOL-A: label only, matching the plan page and the catalog card. */}
            <dd>{difficultyLabel(plan.difficulty)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{plan.timeLabel}</dd>
          </div>
          <div>
            <dt>Cost</dt>
            {/* Tier only. No dollar figures anywhere — see src/lib/format.ts. */}
            <dd>{costTierSymbol(plan.costTier)}</dd>
          </div>
        </dl>
      </header>

      {/* ── CUT LIST — first, always. It is the reason this page is printed. ────── */}
      {plan.cutList.length > 0 && (
        <section className="print-section">
          <h2>Cut list</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col" className="numeric">
                  Qty
                </th>
                <th scope="col">T &times; W &times; L</th>
                <th scope="col">Material</th>
                {/* An empty column to tick parts off as they're cut. On paper, in a
                    workshop, a pencil is the interaction model. */}
                <th scope="col" className="print-tick">
                  &#10003;
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.cutList.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.part}
                    {item.note ? <div className="print-note">{item.note}</div> : null}
                  </td>
                  <td className="numeric">{item.quantity}</td>
                  {/*
                    TAPE-MEASURE FRACTIONS, NOT DECIMALS. 13/16" is what is printed on
                    the blade and the rule; 0.8125" is not a thing you can measure. A
                    decimal cut list is unusable in a workshop, which is the standing
                    rule from Sprint 1 and matters most on the sheet you actually take
                    to the saw.
                  */}
                  <td className="mono">
                    {formatDimensions(item.thicknessIn, item.widthIn, item.lengthIn)}
                  </td>
                  <td>{item.material ?? '—'}</td>
                  <td className="print-tick">&#9744;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── MATERIALS ──────────────────────────────────────────────────────────── */}
      <section className="print-section">
        <h2>Materials</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="numeric">
                Qty
              </th>
              {/* No cost column. Tiers only — see src/lib/format.ts. */}
              <th scope="col" className="print-tick">
                &#10003;
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.materials.map((material) => (
              <tr key={material.id}>
                <td>
                  {material.name}
                  {material.species ? (
                    <span className="muted"> ({material.species})</span>
                  ) : null}
                  {material.note ? (
                    <div className="print-note">{material.note}</div>
                  ) : null}
                </td>
                <td className="numeric">
                  {material.quantity} {material.unit}
                </td>
                <td className="print-tick">&#9744;</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="print-note">
          Overall cost: <strong>{costTierSymbol(plan.costTier)}</strong>. Lumber varies by
          region, species, and season, so we give a band rather than a figure.
        </p>
      </section>

      {/* ── TOOLS + STEPS — the full layout only. ──────────────────────────────── */}
      {!cutListOnly && (
        <>
          <section className="print-section">
            <h2>Tools</h2>
            <ul className="print-tools">
              {plan.tools.map((planTool) => (
                <li key={planTool.id}>
                  {planTool.tool.name}
                  {!planTool.essential ? (
                    <span className="muted"> — optional</span>
                  ) : null}
                  {planTool.note ? (
                    <div className="print-note">{planTool.note}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="print-section print-steps">
            <h2>Instructions</h2>
            {/* `.print-steps ol` sets list-style: none (globals.css) — the number below
                is the ONLY number rendered. It used to render twice: the browser's own
                <ol> marker plus this explicit "N. " text, printing as "1. 1. Mill both
                slabs..." on paper and when the text was copied out. */}
            <ol>
              {plan.steps.map((step) => (
                <li key={step.id}>
                  <h3>
                    {step.stepNumber}. {step.title}
                  </h3>
                  {/* Sprint 21 — what this step needs, on paper too. One line, so it
                      doesn't crowd the printed sheet. Nothing for an untagged step. */}
                  {(step.tools.length > 0 || step.materials.length > 0) && (
                    <p className="print-step-needs">
                      {step.tools.length > 0 && (
                        <>
                          <strong>Tools:</strong>{' '}
                          {step.tools.map((st) => st.tool.name).join(', ')}
                          {step.materials.length > 0 ? '. ' : ''}
                        </>
                      )}
                      {step.materials.length > 0 && (
                        <>
                          <strong>Materials:</strong>{' '}
                          {step.materials.map((sm) => sm.material.name).join(', ')}
                        </>
                      )}
                    </p>
                  )}
                  <Prose text={step.body} />
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      {/* Printed on the paper: where this came from, and when. A cut list found on a
          bench six months later should be able to lead you back to the plan. */}
      <footer className="print-footer">
        <p>
          {SITE_HOST}/plans/{plan.slug}
          {cutListOnly ? ' — cut list' : ''}
        </p>
      </footer>
    </main>
  );
}
