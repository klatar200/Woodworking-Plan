import { notFound } from 'next/navigation';
import { page, btnGhost, categoryLabel } from '@/lib/ui'; // Sprint 29: shell + button + category
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlanBySlug } from '@/lib/plans';
import { isPlanSaved } from '@/lib/saves';
import { isPlanLiked } from '@/lib/likes';
import { isOnShoppingList } from '@/lib/shopping-list';
import { getOwnedToolSlugs, toolFit } from '@/lib/workshop';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { listReviews, getRatingSummary, getMyReview } from '@/lib/reviews';
import { isStorageConfigured } from '@/lib/storage';
import { SaveButton } from '@/components/save-button';
import { LikeButton } from '@/components/like-button';
import { ShoppingListButton } from '@/components/shopping-list-button';
import { ReviewsSection } from '@/components/reviews-section';
import { StarRating } from '@/components/star-rating';
import { StepWalker } from '@/components/step-walker';
import { ViewLogger } from '@/components/view-logger';
import { PlanTabs } from '@/components/plan-tabs';
import { PlanImageSlot } from '@/components/plan-image-slot';
import { InstructionsDisclosure } from '@/components/instructions-disclosure';
import { Prose } from '@/components/prose';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';
import { costTierSymbol, difficultyLabel, formatDimensions } from '@/lib/format';

/**
 * Plan detail — Sprint 3's "plan detail page rendering all structured data from
 * Sprint 1".
 *
 * Every field the Sprint 1 schema stores is rendered here. That is the point:
 * BUSINESS_PLAN.md §9 says the differentiator is "structured, comparable metadata
 * across every single plan." Storing a cut list and then not showing it would
 * make the whole exercise pointless.
 *
 * Deliberately absent: save button (Sprint 6), like button (Sprint 7), comments
 * and tool-substitution notes (never — out of scope until the business plan says
 * otherwise, per BUILD_PLAN.md §4).
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);

  if (!plan) return { title: 'Plan not found' };

  return {
    title: plan.title,
    description: plan.summary,
    // Branding decision #8 is still open, so still no indexing.
    robots: { index: false, follow: false },
  };
}

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { slug } = await params;
  const { notice } = await searchParams;
  const plan = await getPlanBySlug(slug);

  // getPlanBySlug returns null for unknown AND unpublished slugs alike, so this
  // 404 cannot be used to probe for the existence of unreleased content.
  if (!plan) notFound();

  // Sprint 6. The page stays PUBLIC — an anonymous visitor sees the whole plan and
  // a "Save this plan" link that takes them to sign-in and back. §12 gates the
  // save, not the content.
  const [
    user,
    saved,
    liked,
    onShoppingList,
    ownedToolSlugs,
    reviews,
    ratingSummary,
    myReview,
    admin,
  ] = await Promise.all([
    getCurrentUser(),
    isPlanSaved(plan.id),
    isPlanLiked(plan.id),
    isOnShoppingList(plan.id),
    // Sprint 26 — the signed-in user's workshop, to show tool fit. [] for anonymous.
    getOwnedToolSlugs(),
    listReviews(plan.id),
    // COMPUTED on read (Prisma _avg/_count). There is no avgRating column, so there
    // is nothing to backfill and nothing that can drift. See prisma/schema.prisma.
    getRatingSummary(plan.id),
    getMyReview(plan.id),
    isAdmin(),
  ]);

  const essentialTools = plan.tools.filter((t) => t.essential);
  const optionalTools = plan.tools.filter((t) => !t.essential);

  // Sprint 26 — tool fit. Only computed when a signed-in user actually has a workshop;
  // otherwise there's nothing honest to say ("you're missing everything" is noise). The
  // owned set also drives the per-step chip highlight below.
  const ownedSet = new Set(ownedToolSlugs);
  const fit =
    user && ownedToolSlugs.length > 0
      ? toolFit(
          essentialTools.map((pt) => ({ slug: pt.tool.slug, name: pt.tool.name })),
          ownedSet,
        )
      : null;


  return (
    <main id="main" className={`${page} page-wide plan-detail`}>
      {/* Sprint 19. Renders nothing; logs one view after hydration, which is the only
          moment we know a real browser really rendered this page — a server-side log
          would count next/link's catalog prefetches and every crawler. Not on the
          PRINT view: printing a plan is not viewing it. See src/lib/views.ts. */}
      <ViewLogger slug={plan.slug} />

      <p className="breadcrumb">
        <Link href="/">← All plans</Link>
      </p>

      <RateLimitNotice
        show={hasRateLimitNotice(notice)}
        dismissHref={`/plans/${plan.slug}`}
      />

      <header className="plan-header">
        <span className={categoryLabel}>{plan.category.name}</span>
        <h1>{plan.title}</h1>
        <p className="subtitle">{plan.summary}</p>

        <p className="plan-rating">
          <a href="#reviews-heading">
            <StarRating average={ratingSummary.average} count={ratingSummary.count} />
          </a>
        </p>

        {/* Sprint 27 — a read-only community signal: how many people have built this.
            A build IS a review (reviewed ⇒ built, the Sprint 16 rule), so this is the
            review count read through the "built" lens — no extra query, no denormalized
            column (see src/lib/builds.ts). Shown only once someone has built it: "0 built
            this" is noise, and the star rating already states the empty case. */}
        {ratingSummary.count > 0 ? (
          <p className="mt-[0.25rem] mx-0 mb-0">
            <a
              href="#reviews-heading"
              className="text-muted no-underline text-[0.95rem] hover:text-fg"
            >
              🔨 {ratingSummary.count}{' '}
              {ratingSummary.count === 1 ? 'person has' : 'people have'} built this
            </a>
          </p>
        ) : null}

        <div className="plan-actions flex flex-wrap gap-[0.5rem] mt-[1rem]">
          <SaveButton
            planId={plan.id}
            slug={plan.slug}
            isSaved={saved}
            isSignedIn={user !== null}
          />
          {/* The like count is COUNTED (_count), never read from a denormalized
              column — see prisma/schema.prisma. Always shown, including zero:
              hiding a zero hides exactly the plans that need someone to be first. */}
          <LikeButton
            planId={plan.id}
            slug={plan.slug}
            isLiked={liked}
            likeCount={plan._count.likes}
            isSignedIn={user !== null}
          />

          {/* Sprint 22 — explicit "add to shopping list", separate from saving. */}
          <ShoppingListButton
            planId={plan.id}
            slug={plan.slug}
            isOnList={onShoppingList}
            isSignedIn={user !== null}
          />

          {/* Sprint 13. A public route, so the service worker caches it like any other
              plan content — which is exactly why we chose a print PAGE over a
              server-generated PDF. A PDF endpoint needs a network round-trip and would
              be useless in the workshop it was built for. */}
          <Link href={`/plans/${plan.slug}/print`} className={btnGhost}>
            Print / PDF
          </Link>

          {/* Sprint 15. Only offered when there IS a cut list to optimize — a "board
              plan" button on a plan with no parts is a promise of a blank page. */}
          {plan.cutList.length > 0 && (
            <Link href={`/plans/${plan.slug}/boards`} className={btnGhost}>
              Board plan
            </Link>
          )}
        </div>
      </header>

      {/*
        Sprint 20 — the desktop redesign is a two-column grid: the plan's data on the
        left, the image slot on the right. ONE DOM, positioned by CSS: below the desktop
        breakpoint `.plan-detail-grid` is a flex column and the aside is hoisted with
        `order` to sit right under the title, so mobile reads title → photo → details.
        The header above stays full-width in both layouts.

        Everything inside is the SAME server-rendered content as before — the tabs and
        the instructions disclosure only HIDE parts of it after mount (see their files),
        so print, offline, and no-JS still get the entire document.
      */}
      {/* Sprint 30a: two-column layout moved to Tailwind. `plan-detail-grid` and
          `plan-detail-aside` CLASSES retained — the print stylesheet targets them
          (grid→block, aside→hidden) by class. Mobile: flex column, aside hoisted
          under the title via order; desktop (lg): grid, aside is the sticky right rail. */}
      <div className="plan-detail-grid flex flex-col gap-[1.5rem] lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-[2.5rem] lg:items-start">
        <aside
          className="plan-detail-aside order-[-1] lg:order-0 lg:sticky lg:top-[4.5rem]"
          aria-label="Photo"
        >
          <PlanImageSlot
            title={plan.title}
            image={plan.images[0]}
          />
        </aside>

        <div className="min-w-0">
      {/* The at-a-glance strip. This is the product's whole differentiator —
          "what can I build this weekend, with what I own, for under $50?" */}
      <section aria-label="At a glance">
        <dl className="glance-grid">
          <div className="glance-item">
            <dt>Difficulty</dt>
            <dd>
              {difficultyLabel(plan.difficulty)}{' '}
              <span className="muted">({plan.difficulty}/5)</span>
            </dd>
          </div>
          <div className="glance-item">
            <dt>Time</dt>
            <dd>{plan.timeLabel}</dd>
          </div>
          <div className="glance-item">
            <dt>Cost</dt>
            <dd>
              {/* Tier only — no "of $$$$$" qualifier. The tier IS the answer, not a
                  position on a scale; the qualifier only ever repeated the same
                  five characters back at the reader. */}
              <strong>{costTierSymbol(plan.costTier)}</strong>
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>About this build</h2>
        <Prose text={plan.description} />
      </section>

      {/* Sprint 20 — Tools / Materials / Cut List as tabs on the enhanced client.
          Each panel is a `<section data-tab>`; PlanTabs hides the inactive ones AFTER
          mount, so no-JS, print, and offline still get all three stacked with their
          own <h2>s. The `present` flags mean a plan with no cut list gets no empty
          "Cut list" tab — a tab promising a blank panel. */}
      <PlanTabs
        tabs={[
          { id: 'tools', label: 'Tools', present: true },
          { id: 'materials', label: 'Materials', present: true },
          { id: 'cutlist', label: 'Cut list', present: plan.cutList.length > 0 },
        ]}
      >
      <section data-tab="tools" id="panel-tools" role="tabpanel" aria-labelledby="tab-tools">
        <h2>Tools</h2>

        {/* Sprint 26 — how this plan fits YOUR workshop. Only for a signed-in user who
            has set up their tools; based on ESSENTIAL tools, matching the catalog's
            owned-tools filter so both tell the same story. */}
        {fit ? (
          <p
            className={`tool-fit ${fit.ownsAll ? 'tool-fit-owned' : 'tool-fit-missing'}`}
            role="status"
          >
            {fit.ownsAll ? (
              <>
                <strong>✓ You own all {fit.total} essential tools</strong> for this build.
              </>
            ) : (
              <>
                <strong>
                  You own {fit.ownedCount} of {fit.total} essential tools.
                </strong>{' '}
                Missing: {fit.missing.join(', ')}.{' '}
                <Link href="/workshop">Update your workshop</Link>
              </>
            )}
          </p>
        ) : null}

        <h3 className="sub-heading">Essential</h3>
        <ul className="detail-list">
          {essentialTools.map((pt) => (
            <li key={pt.id} className="detail-row">
              <span className="tool-name">{pt.tool.name}</span>
              {pt.note && <span className="muted tool-note">{pt.note}</span>}
            </li>
          ))}
        </ul>

        {optionalTools.length > 0 && (
          <>
            <h3 className="sub-heading">Optional / nice to have</h3>
            <ul className="detail-list">
              {optionalTools.map((pt) => (
                <li key={pt.id} className="detail-row">
                  <span className="tool-name">{pt.tool.name}</span>
                  {pt.note && <span className="muted tool-note">{pt.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section data-tab="materials" id="panel-materials" role="tabpanel" aria-labelledby="tab-materials">
        <h2>Materials</h2>
        <div className="table-scroll">
          {/* NO COST COLUMN. DECISIONS_LOG.md 2026-07-13 — tiers only, no dollar
              figures anywhere in the public UI. A per-material price is the most
              precise-looking and least defensible number on the page: it is a
              hand-authored ballpark for a commodity that moves with region, species and
              season. The tier in the glance strip says the thing that actually changes
              a decision. */}
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Qty</th>
              </tr>
            </thead>
            <tbody>
              {plan.materials.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="material-name">{m.name}</span>
                    {m.note && <span className="muted material-note">{m.note}</span>}
                  </td>
                  <td className="numeric">
                    {m.quantity} {m.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">
          Overall cost: <strong>{costTierSymbol(plan.costTier)}</strong>. Lumber prices
          vary by region, species, and season, so we give a band rather than a figure we
          would only be pretending to know.
        </p>
      </section>

      {plan.cutList.length > 0 && (
        <section data-tab="cutlist" id="panel-cutlist" role="tabpanel" aria-labelledby="tab-cutlist">
          <h2>Cut list</h2>
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
                {plan.cutList.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="material-name">{c.part}</span>
                      {c.material && <span className="muted material-note">{c.material}</span>}
                      {c.note && <span className="muted material-note">{c.note}</span>}
                    </td>
                    <td className="numeric">{c.quantity}</td>
                    {/* Fractional inches, not decimals. 0.8125 is meaningless on
                        a tape measure; 13/16" is what's printed on the blade. */}
                    <td className="numeric mono">
                      {formatDimensions(c.thicknessIn, c.widthIn, c.lengthIn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      </PlanTabs>

      {/* Sprint 20 — Instructions open behind a button on the enhanced client, so the
          overview isn't buried under forty build steps. InstructionsDisclosure keeps
          the whole section in the DOM and only collapses it after mount; print, offline
          and no-JS get it fully open. The StepWalker inside is unchanged bar its new
          last-step CTA. */}
      <InstructionsDisclosure>
      <section>
        <h2>Instructions</h2>
        {/* StepWalker only ever HIDES steps client-side after mount — every
            step below is still fully server-rendered. See step-walker.tsx. */}
        <StepWalker
          stepTitles={plan.steps.map((step) => step.title)}
          reviewCtaHref="#reviews-heading"
        >
          <ol className="steps">
            {plan.steps.map((step) => (
              <li key={step.id} className="step" data-step={step.stepNumber}>
                <h3 className="step-title">
                  <span className="step-number">{step.stepNumber}</span>
                  {step.title}
                </h3>

                {/* Sprint 21 — what this step calls for, so a builder can gather it
                    without reading ahead. Renders nothing for an untagged step, which
                    is every step until the content pass reaches its plan. */}
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
        </StepWalker>
      </section>
      </InstructionsDisclosure>

      {plan.tags.length > 0 && (
        <section>
          <h2>Tags</h2>
          <ul className="badges">
            {plan.tags.map((tag) => (
              <li key={tag} className="badge">
                {tag}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ReviewsSection
        planId={plan.id}
        slug={plan.slug}
        reviews={reviews}
        summary={ratingSummary}
        myReview={myReview}
        isSignedIn={user !== null}
        isAdmin={admin}
        photosEnabled={isStorageConfigured()}
      />
        </div>
      </div>
    </main>
  );
}
