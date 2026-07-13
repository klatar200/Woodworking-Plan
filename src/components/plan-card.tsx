import Link from 'next/link';
import type { PlanListItem } from '@/lib/plans';
import {
  costTierSymbol,
  difficultyLabel,
  formatTimeRange,
  formatCostRange,
} from '@/lib/format';

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
export function PlanCard({ plan }: { plan: PlanListItem }) {
  const image = plan.images[0];

  return (
    <li className="plan-card">
      <Link href={`/plans/${plan.slug}`} className="plan-card-link">
        {/*
          Plain <img>, not next/image. next/image requires allowlisting each
          remote host in next.config, and no plan has an image yet (Sprint 1 left
          `images: []` — sourcing photography is a content decision, not a dev
          task). Configuring image optimization for content that does not exist is
          premature. Revisit when real images land.
        */}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="plan-card-image" src={image.url} alt={image.alt} />
        ) : null}

        <div className="plan-card-body">
          <span className="plan-card-category">{plan.category.name}</span>
          <h3 className="plan-card-title">{plan.title}</h3>
          <p className="plan-card-summary">{plan.summary}</p>

          <ul className="badges" aria-label="Plan details">
            <li className="badge" title={`Difficulty: ${difficultyLabel(plan.difficulty)}`}>
              {difficultyLabel(plan.difficulty)}
            </li>
            <li
              className="badge"
              title={`Estimated materials: ${formatCostRange(plan.costMinCents, plan.costMaxCents)}`}
            >
              {costTierSymbol(plan.costTier)}
            </li>
            <li className="badge">
              {formatTimeRange(plan.timeMinMinutes, plan.timeMaxMinutes)}
            </li>
          </ul>
        </div>
      </Link>
    </li>
  );
}
