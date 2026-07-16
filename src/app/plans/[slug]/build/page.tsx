import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { page, categoryLabel } from '@/lib/ui';
import { getPlanBySlug } from '@/lib/plans';
import { getOwnedToolSlugs } from '@/lib/workshop';
import { StepWalker } from '@/components/step-walker';
import { PlanSteps } from '@/components/plan-steps';

/**
 * The build page — /plans/[slug]/build (2026-07-16, Keagan's direction).
 *
 * The step-by-step instructions ARE the product (BUSINESS_PLAN.md §2), and the
 * Sprint 20 inline disclosure gave them a corner of the plan page. This page
 * gives them the whole viewport: the StepWalker (rail on desktop, dots on a
 * phone, progress bar, Prev/Next) over the full server-rendered step list.
 *
 * What deliberately did NOT change:
 *   - The plan page still renders every step in its document (hidden once JS
 *     mounts) — print, offline, and no-JS on that page keep the entire plan.
 *   - StepWalker is the SAME component with the same progressive-enhancement
 *     contract: without JS this page is simply the full step list, readable
 *     top to bottom, plus the print stylesheet's guarantees (`.step` is
 *     break-inside: avoid; the walker chrome is print-hidden by class).
 *   - PUBLIC route: covered by the '/plans(.*)' allowlist entry, same
 *     reasoning as the plan page — content is free, actions are gated. Only
 *     `published: true` plans resolve (data layer), and getPlanBySlug returns
 *     null for unknown AND unpublished slugs alike, so the 404 can't probe
 *     staged content.
 *   - NO ViewLogger here (Sprint 19 rule: the count must mean something).
 *     Every visit to this page comes through the plan page, which already
 *     logged the view — logging both would double-count builders vs browsers.
 *   - OFFLINE: saving a plan pre-caches this page alongside the plan, print,
 *     and board views (see service-worker.tsx) — mid-build in a garage with
 *     no signal is exactly the BUSINESS_PLAN.md §5 scenario.
 *
 * The finish CTA points back to the plan page's reviews anchor — reviews live
 * with the plan (one review form, one URL for it), not with the walker.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);

  if (!plan) return { title: 'Plan not found' };

  return {
    title: `Build: ${plan.title}`,
    description: `Step-by-step instructions for ${plan.title}.`,
    // Branding decision #8 is still open, so still no indexing.
    robots: { index: false, follow: false },
  };
}

export default async function PlanBuildPage({ params }: { params: Params }) {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);

  if (!plan) notFound();

  // Sprint 26 — highlight owned tools on the per-step chips. [] for anonymous.
  const ownedToolSlugs = await getOwnedToolSlugs();

  return (
    <main id="main" className={`${page} page-wide plan-detail`}>
      <p className="breadcrumb">
        <Link href={`/plans/${plan.slug}`}>&larr; Back to the plan</Link>
      </p>

      <header className="plan-header">
        <span className={categoryLabel}>{plan.category.name}</span>
        <h1>{plan.title}</h1>
        <p className="subtitle">
          Step-by-step build &mdash; {plan.steps.length}{' '}
          {plan.steps.length === 1 ? 'step' : 'steps'}. Also available as a{' '}
          <Link href={`/plans/${plan.slug}/print`}>print sheet</Link>.
        </p>
      </header>

      <section aria-label="Instructions" className="mt-[1.5rem]">
        <StepWalker
          stepTitles={plan.steps.map((step) => step.title)}
          reviewCtaHref={`/plans/${plan.slug}#reviews-heading`}
        >
          <PlanSteps steps={plan.steps} ownedToolSlugs={ownedToolSlugs} />
        </StepWalker>
      </section>
    </main>
  );
}
