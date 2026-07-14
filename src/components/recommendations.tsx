import { PlanCard } from '@/components/plan-card';
import type { Recommendation } from '@/lib/recommendations';
import type { RatingSummary } from '@/lib/reviews';

interface Props {
  recommendations: Recommendation[];
  ratings: Map<string, RatingSummary>;
  /** `null` for an anonymous visitor. See page.tsx and save-toggle.tsx. */
  savedIds: Set<string> | null;
}

/**
 * "Recommended for you" — Sprint 11.
 *
 * RENDERS NOTHING when there is nothing to say: an anonymous visitor, or a signed-in
 * user who has saved and liked nothing. Not an empty shell, not a "start saving plans
 * to see recommendations!" placeholder, and NOT a fallback row of popular plans.
 *
 * That last one deserves saying out loud, because it is the tempting option: a
 * heading that says "Recommended for you" above the same popular plans everyone else
 * sees is a LIE TOLD BY THE UI. It makes the feature look alive while personalizing
 * nothing. The catalog already has a Popular sort for that need. Honest absence beats
 * a fake presence.
 *
 * EVERY CARD SAYS WHY. A recommendation with no reason is indistinguishable from a
 * random plan, and the user has no way to tell whether the feature works or is
 * broken — so neither do we.
 */
export function Recommendations({ recommendations, ratings, savedIds }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <section aria-labelledby="recommendations-heading" className="recommendations">
      <h2 id="recommendations-heading">Recommended for you</h2>
      <p className="muted small">Based on the plans you&apos;ve saved and liked.</p>

      <ul className="plan-grid">
        {recommendations.map(({ plan, reason }) => (
          <li key={plan.id} className="recommendation">
            <ul className="plan-grid-inner">
              <PlanCard
                plan={plan}
                rating={ratings.get(plan.id)}
                saved={savedIds ? savedIds.has(plan.id) : undefined}
                // Recommendations only render on the unnarrowed catalog front
                // page, so a rate-limit denial bounces back to exactly that.
                returnTo="/"
              />
            </ul>
            <p className="recommendation-reason">
              <span className="visually-hidden">Recommended because it is </span>
              {reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
