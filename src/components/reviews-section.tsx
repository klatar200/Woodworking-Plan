import Link from 'next/link';
import Image from 'next/image';
import { submitReviewAction, deleteReviewAction } from '@/app/actions/reviews';
import { StarRating } from '@/components/star-rating';
import { MAX_BODY_LENGTH, MAX_PHOTOS_PER_REVIEW } from '@/lib/reviews';
import type { PlanReview, RatingSummary } from '@/lib/reviews';

interface Props {
  planId: string;
  slug: string;
  reviews: PlanReview[];
  summary: RatingSummary;
  myReview: PlanReview | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  photosEnabled: boolean;
}

/**
 * Reviews, ratings and "I made this" photos — Sprint 10. BUSINESS_PLAN.md §10.
 *
 * A plain <form> posting to a server action, like every other write in this app. No
 * client component, no optimistic UI, works with JavaScript off.
 *
 * The plan page is PUBLIC, so an anonymous visitor READS every review and gets a
 * link to sign in rather than a disabled form. BUSINESS_PLAN.md §12 gates
 * participation, not content — a stranger who lands here needs a door, not a wall.
 *
 * The admin delete button renders only for an admin, but THE BUTTON IS NOT WHAT
 * PROTECTS THE DELETE. `deleteReview()` re-derives admin status server-side. Anyone
 * can POST to a server action id whether or not the UI ever showed them a control.
 */
export function ReviewsSection({
  planId,
  slug,
  reviews,
  summary,
  myReview,
  isSignedIn,
  isAdmin,
  photosEnabled,
}: Props) {
  return (
    <section aria-labelledby="reviews-heading" className="reviews">
      <h2 id="reviews-heading">Reviews &amp; builds</h2>

      <p className="review-summary">
        <StarRating average={summary.average} count={summary.count} />
      </p>

      {isSignedIn ? (
        <form action={submitReviewAction} className="review-form" encType="multipart/form-data">
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="slug" value={slug} />

          <h3>{myReview ? 'Edit your review' : 'Write a review'}</h3>

          <fieldset className="rating-input">
            <legend>Your rating</legend>
            {/* Radio buttons, not a JS star widget. A rating that needs JavaScript to
                be entered is a rating some people cannot leave. */}
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="rating-option">
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  defaultChecked={myReview?.rating === value}
                  required
                />
                <span>
                  {value} {value === 1 ? 'star' : 'stars'}
                </span>
              </label>
            ))}
          </fieldset>

          <label htmlFor="review-body">
            What did you think? <span className="muted">(optional)</span>
          </label>
          <textarea
            id="review-body"
            name="body"
            rows={4}
            maxLength={MAX_BODY_LENGTH}
            defaultValue={myReview?.body ?? ''}
            placeholder="How did the build go? Anything you'd do differently?"
          />

          {photosEnabled ? (
            <>
              <label htmlFor="review-photos">
                Show your build <span className="muted">(up to {MAX_PHOTOS_PER_REVIEW})</span>
              </label>
              <input
                id="review-photos"
                type="file"
                name="photos"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
              />
              {/* `accept` is a CONVENIENCE for the file picker, not a control. The
                  server decides the file type from magic bytes and re-encodes every
                  byte — see src/lib/storage.ts. */}

              <label htmlFor="review-alt">Describe your photos for screen readers</label>
              <input
                id="review-alt"
                type="text"
                name="photoAlt"
                maxLength={300}
                placeholder="A walnut cutting board with a live edge"
              />

              <p className="muted small">
                Photos are resized and their location data is removed before they are
                stored.
              </p>
            </>
          ) : null}

          <button type="submit" className="btn btn-primary">
            {myReview ? 'Update review' : 'Post review'}
          </button>
        </form>
      ) : (
        <p>
          <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/plans/${slug}`)}`}>
            Sign in
          </Link>{' '}
          to review this plan or share your build.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="muted">No reviews yet. Be the first to build this.</p>
      ) : (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.id} className="review">
              <div className="review-head">
                <span className="review-author">
                  {review.user.displayName ?? 'A maker'}
                </span>
                <StarRating average={review.rating} count={1} />
                <time dateTime={review.createdAt.toISOString()} className="muted">
                  {review.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>

              {review.body ? <p className="review-body">{review.body}</p> : null}

              {review.photos.length > 0 ? (
                <ul className="build-photos">
                  {review.photos.map((photo) => (
                    <li key={photo.id}>
                      {/* next/image needs the blob host allowlisted in next.config.ts,
                          AND the host must be in the CSP img-src — miss either and the
                          photo is silently blocked. */}
                      <Image
                        src={photo.url}
                        alt={photo.alt}
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 640px) 50vw, 240px"
                        className="build-photo"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Rendered for the author or an admin. The server re-checks; this is
                  presentation, not authorization. */}
              {isAdmin || myReview?.id === review.id ? (
                <form action={deleteReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="btn btn-ghost btn-danger">
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
