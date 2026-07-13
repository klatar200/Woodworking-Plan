import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPathBySlug, getBuiltPlanIds, summarizeProgress } from '@/lib/paths';
import { getRatingSummaries } from '@/lib/reviews';
import { PlanCard } from '@/components/plan-card';

/**
 * A learning path — Sprint 16.
 *
 * PROGRESS IS DERIVED FROM REVIEWS. There is no progress table (see src/lib/paths.ts).
 * A step reads as done when the user has reviewed that plan — you reviewed it, you built
 * it. Anonymous visitors see the path with no progress at all, which is correct: the
 * content is public, the personalization is not.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const path = await getPathBySlug(slug);

  if (!path) return { title: 'Path not found' };

  return {
    title: path.title,
    description: path.summary,
    robots: { index: false, follow: false },
  };
}

export default async function PathDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  const path = await getPathBySlug(slug);

  // Null for unknown AND unpublished alike, so a 404 cannot probe for staged content.
  if (!path) notFound();

  const [builtPlanIds, ratings] = await Promise.all([
    getBuiltPlanIds(),
    getRatingSummaries(path.steps.map((step) => step.plan.id)),
  ]);

  const progress = summarizeProgress(path.steps, builtPlanIds);

  return (
    <main id="main" className="page">
      <p className="breadcrumb">
        <Link href="/paths">← All paths</Link>
      </p>

      <header>
        <h1>{path.title}</h1>
        <p className="subtitle">{path.summary}</p>
      </header>

      {/* Progress renders only when there IS progress — an anonymous visitor, or a signed-in
          user who has built none of it, gets no "0 of 5" bar. A zero-progress bar tells you
          nothing you did not already know and makes the page feel like a chore list. */}
      {progress.completed > 0 && (
        <p className="path-progress">
          <strong>
            {progress.completed} of {progress.total}
          </strong>{' '}
          built
          {progress.nextStepNumber !== null ? (
            <> &middot; next up: step {progress.nextStepNumber}</>
          ) : (
            <> &middot; the whole path. Nicely done.</>
          )}
        </p>
      )}

      <section className="prose">
        {path.description.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <ol className="path-steps">
        {path.steps.map((step) => {
          const built = builtPlanIds.has(step.plan.id);
          const isNext = step.stepNumber === progress.nextStepNumber;

          return (
            <li
              key={step.id}
              className={`path-step ${built ? 'path-step-done' : ''} ${isNext ? 'path-step-next' : ''}`}
            >
              <div className="path-step-head">
                <span className="path-step-number" aria-hidden="true">
                  {built ? '✓' : step.stepNumber}
                </span>
                <span className="visually-hidden">
                  Step {step.stepNumber}
                  {built ? ', built' : ''}
                  {isNext ? ', next up' : ''}:
                </span>

                {/* THE REASON IS THE FEATURE. An ordered list of plans with no explanation
                    of why each comes where it does is a collection with numbers on it. */}
                <p className="path-step-reason">{step.reason}</p>
              </div>

              <ul className="plan-grid-inner">
                <PlanCard plan={step.plan} rating={ratings.get(step.plan.id)} />
              </ul>
            </li>
          );
        })}
      </ol>

      <p className="footnote">
        A step counts as built once you&rsquo;ve <strong>reviewed</strong> that plan.
        We don&rsquo;t track completion separately &mdash; your review is the record.
      </p>
    </main>
  );
}
