import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { page, chip, chipActive } from '@/lib/ui';
import { getPlanBySlug } from '@/lib/plans';
import { formatDimensions } from '@/lib/format';
import { PartDiagram } from '@/components/part-diagram';

/**
 * QOL-G PILOT — generated part diagrams. **DEV-ONLY. NOT WIRED INTO ANY LIVE PAGE.**
 *
 * `QOL_UI_BUILD_PLAN.md` QOL-G: build a generic SVG renderer off each plan's existing
 * `cutList`, pilot it on five plans behind a dev-only route, and report whether it reads
 * more clearly than the cut-list table plus the board-plan link — BEFORE deciding on a
 * catalog-wide rollout. Nothing here touches `/plans/[slug]` or the build page.
 *
 * ── TWO INDEPENDENT GATES, and both fail closed ─────────────────────────────
 * 1. `NODE_ENV === 'production'` → `notFound()`. This is the real gate: the route cannot
 *    be reached on the deployed site by anyone, signed in or not, admin or not.
 * 2. `/dev/...` is NOT on the `PUBLIC_ROUTES` allowlist, so the middleware also demands a
 *    session. Redundant with (1) in production and the correct posture in development.
 *
 * The gate is deliberately an environment check rather than an `ADMIN_USER_IDS` check:
 * admin is an authorization concept for real features, and this is scaffolding that
 * should not exist in production at all. It also carries `robots: noindex`, though a 404
 * makes that moot.
 *
 * ── WHAT THE PILOT IS ACTUALLY FOR ──────────────────────────────────────────
 * The question is not "can this be built" (it can, and cheaply — see part-diagram.ts).
 * It is "is the picture clearer than the table". So every plan below renders the diagram
 * and the real cut-list table side by side, at the same width, from the same rows. Judge
 * them against each other.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dev — part diagrams (QOL-G pilot)',
  robots: { index: false, follow: false },
};

/** Five plans chosen for VARIETY of cut list, not for looking good. */
const PILOT_SLUGS = [
  // One row, six identical copies — the quantity-collapse case.
  'edge-grain-maple-cutting-board',
  // Five rows spanning a 60″ side panel and a 3″ toe kick — the widest scale spread.
  'pine-bookcase',
  // A jig: a big flat panel plus two thin runners — the minimum-height case.
  'crosscut-sled',
  // Ordinary box construction, the commonest shape in the catalog.
  'cedar-planter-box',
  // Large furniture, where the parts genuinely differ in kind.
  'farmhouse-dining-table',
] as const;

type SearchParams = Promise<{ plan?: string; part?: string }>;

export default async function DevDiagramsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // GATE 1. Before any work, any query, any read of the params.
  if (process.env.NODE_ENV === 'production') notFound();

  const { part: highlightedPart } = await searchParams;

  const plans = (await Promise.all(PILOT_SLUGS.map((slug) => getPlanBySlug(slug)))).filter(
    (plan): plan is NonNullable<typeof plan> => plan !== null,
  );

  return (
    <main id="main" className={`${page} page-wide`}>
      <p className="breadcrumb">
        <Link href="/browse">← Back to the catalog</Link>
      </p>

      <h1>Part diagrams — QOL-G pilot</h1>
      <p className="subtitle">
        Dev-only. Generated entirely from each plan&rsquo;s existing cut list &mdash; no
        artwork, nothing authored per plan. Every diagram sits next to the real cut-list
        table so the two can be judged against each other.
      </p>

      <div className="notice notice-warning">
        <strong>The finding that matters — read this before the pictures.</strong>
        <p className="mt-[0.5rem] mb-0">
          Per-step highlighting <strong>cannot be driven automatically today</strong>.
          Sprint 21 gave each step its <em>tools</em> and <em>materials</em>, and those
          links are exact — but <strong>nothing in the schema connects a step to a
          cut-list ROW</strong>. The two vocabularies do not even overlap: a cut-list row
          says <code>Pine</code> while the material list says{' '}
          <code>Pine boards, 1x10 (3/4&quot; x 9-1/4&quot; actual)</code>. Matching them
          would mean guessing, and a diagram that highlights the wrong part tells a
          builder this step involves a piece it does not &mdash; the same class of trust
          bug as a step tagged with a tool the plan never lists (the Sprint 21 subset
          rule), and the same reason the shopping list refuses fuzzy matching.
        </p>
        <p className="mt-[0.5rem] mb-0">
          So the highlight mechanism below is <strong>real and prop-driven</strong>, but
          it is exercised by clicking a part, not by a step. Making it automatic is a{' '}
          <strong>schema change</strong> &mdash; a <code>StepPart</code> join, the same
          shape as <code>StepTool</code>, plus a content pass to populate it. That is a
          decision for you, not something to fake in a renderer.
        </p>
      </div>

      {plans.map((plan) => {
        const parts = plan.cutList.map((row) => ({
          id: row.id,
          label: row.part,
          quantity: row.quantity,
          thicknessIn: row.thicknessIn,
          widthIn: row.widthIn,
          lengthIn: row.lengthIn,
          material: row.material,
        }));

        return (
          <section key={plan.id} className="mt-[3rem] border-t border-border pt-[1.5rem]">
            <h2>{plan.title}</h2>

            {parts.length === 0 ? (
              <p className="muted">
                No cut list &mdash; 12 of the 85 catalog plans are in this state, and they
                get no diagram at all. Worth remembering before any rollout: this feature
                is free for plans that carry a cut list and impossible for those that do
                not.
              </p>
            ) : (
              <>
                {/* Highlight demo. GET links, no client state — clicking a part name
                    puts its id in the URL and the diagram dims everything else. */}
                <p className="flex flex-wrap gap-[0.375rem] items-center">
                  <span className="muted small mr-[0.25rem]">Highlight a part:</span>
                  {plan.cutList.map((row) => (
                    <Link
                      key={row.id}
                      href={
                        highlightedPart === row.id
                          ? '/dev/diagrams'
                          : `/dev/diagrams?part=${row.id}`
                      }
                      className={highlightedPart === row.id ? chipActive : chip}
                    >
                      {row.part}
                    </Link>
                  ))}
                </p>

                <div className="grid gap-[1.5rem] lg:grid-cols-2 lg:items-start">
                  <div className="min-w-0">
                    <h3 className="sub-heading">Generated diagram</h3>
                    <PartDiagram
                      parts={parts}
                      highlightPartIds={highlightedPart ? [highlightedPart] : []}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="sub-heading">The cut list as it ships today</h3>
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th scope="col">Part</th>
                            <th scope="col">Qty</th>
                            <th scope="col">T × W × L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.cutList.map((row) => (
                            <tr key={row.id}>
                              <td>{row.part}</td>
                              <td className="numeric">{row.quantity}</td>
                              <td className="numeric mono">
                                {formatDimensions(row.thicknessIn, row.widthIn, row.lengthIn)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="footnote">
                      Plus <Link href={`/plans/${plan.slug}/boards`}>the board plan</Link>,
                      which already draws a to-scale bar per board &mdash; the thing this
                      diagram has to beat.
                    </p>
                  </div>
                </div>

                {/* The per-step data that IS exact, shown so the gap above is concrete. */}
                <h3 className="sub-heading">Per-step tools (exact — Sprint 21 joins)</h3>
                <ul className="detail-list">
                  {plan.steps.map((step) => (
                    <li key={step.id} className="detail-row">
                      <strong>
                        {step.stepNumber}. {step.title}
                      </strong>{' '}
                      {step.tools.length > 0 ? (
                        <span className="muted">
                          {step.tools.map((t) => t.tool.name).join(', ')}
                        </span>
                      ) : (
                        <span className="muted">no tools tagged</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </main>
  );
}
