import Link from 'next/link';
import type { PlanListItem } from '@/lib/plans';
import type { RatingSummary } from '@/lib/reviews';
import { StarRating } from '@/components/star-rating';
import { SaveToggle } from '@/components/save-toggle';
import { costTierSymbol, difficultyLabel, formatTimeRange } from '@/lib/format';
import { categoryLabel } from '@/lib/ui';

// Sprint 29 (UI migration, wave 1): card chrome moved from `globals.css` to Tailwind
// utilities (strings verified byte-identical — see SPRINT_LOG.md Sprint 29). The
// `plan-card` class is RETAINED (utilities added alongside) because the saved-page and
// paths-page context rules still target it by class; the inner elements are fully
// converted. The category eyebrow uses the shared `categoryLabel` (reused on 3 pages).
const cardLink =
  'block h-full text-inherit no-underline hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-[-2px]';

/**
 * A catalog card.
 *
 * Shows the four things a woodworker uses to decide what to build next
 * (BUSINESS_PLAN.md §2): difficulty, cost, time, category. That is the entire
 * differentiator in §9 — "structured, comparable metadata across every plan" —
 * so the card leads with it rather than burying it under a photo.
 *
 * The whole card is one link. On a phone, a small "View plan →" target is a bad
 * joke; the tap target should be the thing you're looking at.
 */
export function PlanCard({
  plan,
  rating,
  saved,
  returnTo,
}: {
  plan: PlanListItem;
  /** Sprint 10. Undefined when the plan has no reviews — see below. */
  rating?: RatingSummary;
  /**
   * Undefined for an anonymous visitor — renders no bookmark overlay at all,
   * same as before this prop existed. `true`/`false` for a signed-in viewer,
   * from a saved-plan-id set the page fetches once, not per card.
   */
  saved?: boolean;
  /** Passed through to SaveToggle — see save-toggle.tsx. */
  returnTo?: string;
}) {
  const image = plan.images[0];

  return (
    <li className="plan-card relative bg-surface border border-border rounded-[0.5rem] overflow-hidden">
      <Link href={`/plans/${plan.slug}`} className={cardLink}>
        {/*
          Plain <img>, not next/image. next/image requires allowlisting each
          remote host in next.config, and no plan has an image yet (Sprint 1 left
          `images: []` — sourcing photography is a content decision, not a dev
          task). Configuring image optimization for content that does not exist is
          premature. Revisit when real images land.
        */}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="w-full aspect-[3/2] object-cover block"
            src={image.url}
            alt={image.alt}
          />
        ) : null}

        <div className="p-[1rem]">
          <span className={categoryLabel}>{plan.category.name}</span>
          <h3 className="mx-0 mt-0 mb-[0.375rem] text-[1.0625rem] leading-[1.3]">
            {plan.title}
          </h3>
          <p className="mx-0 mt-0 mb-[0.75rem] text-muted text-[0.9375rem]">
            {plan.summary}
          </p>

          {/* Sprint 10. Only rendered once the plan HAS reviews — same reasoning as
              the like badge below. A grid of "No reviews yet" on a young catalog is
              noise on every single card. The DETAIL page always shows the state,
              including "no reviews", because that is where someone decides to be the
              first to leave one. */}
          {rating && rating.count > 0 ? (
            <p className="mt-[0.35rem] mx-0 mb-0 text-[0.9rem]">
              <StarRating average={rating.average} count={rating.count} />
            </p>
          ) : null}

          <ul className="badges" aria-label="Plan details">
            <li className="badge" title={`Difficulty: ${difficultyLabel(plan.difficulty)}`}>
              {difficultyLabel(plan.difficulty)}
            </li>
            {/* TIER ONLY — no dollar figure, and not even in the tooltip. See
                src/lib/format.ts: a number here is a claim of precision we cannot
                support, and the tier says the decision-relevant thing anyway. */}
            <li className="badge" title="Estimated material cost">
              {costTierSymbol(plan.costTier)}
            </li>
            <li className="badge">
              {formatTimeRange(plan.timeMinMinutes, plan.timeMaxMinutes)}
            </li>
            {/* Sprint 7. Only shown when someone has actually liked it — a wall of
                "♥ 0" badges is noise, and on a young catalog it would be every
                card. The detail page always shows the count, including zero. */}
            {plan._count.likes > 0 && (
              <li className="badge">♥ {plan._count.likes}</li>
            )}
          </ul>
        </div>
      </Link>

      {/* Sibling of the Link, not nested inside it — see save-toggle.tsx. */}
      {saved !== undefined && (
        <SaveToggle
          planId={plan.id}
          slug={plan.slug}
          isSaved={saved}
          returnTo={returnTo}
        />
      )}
    </li>
  );
}
