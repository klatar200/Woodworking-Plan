import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlanBySlug } from '@/lib/plans';
import { isPlanSaved } from '@/lib/saves';
import { isPlanLiked } from '@/lib/likes';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { listReviews, getRatingSummary, getMyReview } from '@/lib/reviews';
import { isStorageConfigured } from '@/lib/storage';
import { SaveButton } from '@/components/save-button';
import { LikeButton } from '@/components/like-button';
import { ReviewsSection } from '@/components/reviews-section';
import { StarRating } from '@/components/star-rating';
import {
  costTierSymbol,
  difficultyLabel,
  formatCostRange,
  formatCents,
  formatDimensions,
} from '@/lib/format';

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

export default async function PlanDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);

  // getPlanBySlug returns null for unknown AND unpublished slugs alike, so this
  // 404 cannot be used to probe for the existence of unreleased content.
  if (!plan) notFound();

  // Sprint 6. The page stays PUBLIC — an anonymous visitor sees the whole plan and
  // a "Save this plan" link that takes them to sign-in and back. §12 gates the
  // save, not the content.
  const [user, saved, liked, reviews, ratingSummary, myReview, admin] = await Promise.all([
    getCurrentUser(),
    isPlanSaved(plan.id),
    isPlanLiked(plan.id),
    listReviews(plan.id),
    // COMPUTED on read (Prisma _avg/_count). There is no avgRating column, so there
    // is nothing to backfill and nothing that can drift. See prisma/schema.prisma.
    getRatingSummary(plan.id),
    getMyReview(plan.id),
    isAdmin(),
  ]);

  const essentialTools = plan.tools.filter((t) => t.essential);
  const optionalTools = plan.tools.filter((t) => !t.essential);

  const itemizedTotal = plan.materials.reduce(
    (sum, m) => sum + (m.costCents ?? 0),
    0,
  );

  return (
    <main id="main" className="page page-wide">
      <p className="breadcrumb">
        <Link href="/">← All plans</Link>
      </p>

      <header className="plan-header">
        <span className="plan-card-category">{plan.category.name}</span>
        <h1>{plan.title}</h1>
        <p className="subtitle">{plan.summary}</p>

        <p className="plan-rating">
          <a href="#reviews-heading">
            <StarRating average={ratingSummary.average} count={ratingSummary.count} />
          </a>
        </p>

        <div className="plan-actions">
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

          {/* Sprint 13. A public route, so the service worker caches it like any other
              plan content — which is exactly why we chose a print PAGE over a
              server-generated PDF. A PDF endpoint needs a network round-trip and would
              be useless in the workshop it was built for. */}
          <Link href={`/plans/${plan.slug}/print`} className="btn btn-ghost">
            Print / PDF
          </Link>
        </div>
      </header>

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
            <dt>Cost tier</dt>
            <dd>
              <strong>{costTierSymbol(plan.costTier)}</strong>{' '}
              <span className="muted">
                {formatCostRange(plan.costMinCents, plan.costMaxCents)}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>About this build</h2>
        <div className="prose">
          {plan.description.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section>
        <h2>Tools</h2>
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

      <section>
        <h2>Materials</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Qty</th>
                <th scope="col">Est. cost</th>
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
                  <td className="numeric">
                    {m.costCents !== null ? (
                      formatCents(m.costCents)
                    ) : (
                      <span className="muted">varies</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {itemizedTotal > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <strong>Itemized total</strong>
                  </td>
                  <td className="numeric">
                    <strong>{formatCents(itemizedTotal)}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="footnote">
          Estimates only. Lumber prices vary by region, species, and season.
        </p>
      </section>

      {plan.cutList.length > 0 && (
        <section>
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

      <section>
        <h2>Instructions</h2>
        <ol className="steps">
          {plan.steps.map((step) => (
            <li key={step.id} className="step">
              <h3 className="step-title">
                <span className="step-number">{step.stepNumber}</span>
                {step.title}
              </h3>
              <div className="prose">
                {step.body.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

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
    </main>
  );
}
