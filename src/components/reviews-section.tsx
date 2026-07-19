import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { submitReviewAction, deleteReviewAction, deletePhotoAction } from '@/app/actions/reviews';
import { StarRating } from '@/components/star-rating';
import { btnPrimary, btnDanger } from '@/lib/ui'; // Sprint 29: shared button classes
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
    <section
      aria-labelledby="reviews-heading"
      className="mt-[3rem] border-t border-border pt-[1.5rem]"
    >
      <h2 id="reviews-heading">Reviews &amp; builds</h2>

      <p className="text-[1.1rem]">
        <StarRating average={summary.average} count={summary.count} />
      </p>

      {isSignedIn ? (
        <form
          action={submitReviewAction}
          className="bg-surface flex flex-col gap-[0.6rem] mt-[1rem] mx-0 mb-[2rem] p-[1rem] border border-border rounded-[0.5rem]"
        >
          {/*
            NO `encType` ON THIS FORM, AND DO NOT ADD ONE BACK (fixed 2026-07-19).

            The file input below makes `encType="multipart/form-data"` look mandatory —
            it is what a plain HTML form would need. It is not needed here, and React
            warns about it on every render: when `action` is a SERVER ACTION rather than
            a URL, React owns the encoding and always submits multipart, overriding
            whatever the attribute says. Specifying it achieved nothing except logging
            "Cannot specify a encType or method for a form that specifies a function as
            the action" on every plan page viewed by a signed-in user.

            Uploads are unaffected — they always went over React's own multipart
            encoding, never this attribute. The same rule covers `method`: don't set it.
          */}
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="slug" value={slug} />

          <h3>{myReview ? 'Edit your review' : 'Write a review'}</h3>

          <fieldset className="border-0 p-0 m-0">
            <legend className="p-0 mb-[0.4rem] font-semibold">Your rating</legend>
            {/*
              QOL-B item 6 — a clickable star widget that is STILL the radio group.
              THE RADIOS ARE NOT REPLACED, and they are not hidden with `display: none`:
              they are `visually-hidden` (clipped, still focusable, still submitted), and
              each star is that radio's own <label>. So this works with JavaScript off,
              with a keyboard (arrow keys move between radios exactly as before), and
              with a screen reader (each label carries "3 stars" in text) — the original
              comment stands: a rating that needs JavaScript to be entered is a rating
              some people cannot leave. There is no client component here at all.

              THE ORDER IS REVERSED ON PURPOSE. Filling "this star and every star to its
              left" needs a preceding-sibling selector, which CSS does not have — so the
              radios run 5→1 in the DOM and `flex-row-reverse` paints them 1→5 on screen.
              Tailwind's `peer-checked:` compiles to `:where(.peer):checked ~ &`, so
              checking ★3 fills the labels that FOLLOW it in the DOM — 3, 2 and 1 — which
              is the leftmost three on screen. Exactly the wanted behaviour, no JS.

              KNOWN LIMIT, accepted: hover fills only the star under the cursor, not the
              run up to it. That would need `:has()` per-star and a chain of selectors
              for a cue that does not exist on touch, which is where most reviews are
              written. Click/keyboard feedback is exact, which is the part that matters.
            */}
            <div className="flex flex-row-reverse justify-end">
              {[5, 4, 3, 2, 1].map((value) => (
                <Fragment key={value}>
                  <input
                    type="radio"
                    id={`rating-${value}`}
                    name="rating"
                    value={value}
                    defaultChecked={myReview?.rating === value}
                    required
                    className="peer visually-hidden"
                  />
                  <label
                    htmlFor={`rating-${value}`}
                    className="inline-flex items-center min-h-[44px] px-[0.15rem] text-[1.75rem] leading-none cursor-pointer text-muted-2 hover:text-accent-strong peer-checked:text-accent-strong peer-focus-visible:outline-2 peer-focus-visible:outline-ok peer-focus-visible:outline-offset-2"
                  >
                    <span className="visually-hidden">
                      {value} {value === 1 ? 'star' : 'stars'}
                    </span>
                    <span aria-hidden="true">★</span>
                  </label>
                </Fragment>
              ))}
            </div>
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
            className="w-full px-[0.75rem] py-[0.5rem] text-[1rem] [font-family:inherit] text-fg bg-bg border border-border rounded-[0.375rem]"
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
                className="w-full px-[0.75rem] py-[0.5rem] text-[1rem] [font-family:inherit] text-fg bg-bg border border-border rounded-[0.375rem]"
              />

              <p className="muted small">
                Photos are resized and their location data is removed before they are
                stored.
              </p>
            </>
          ) : null}

          <button type="submit" className={btnPrimary}>
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
        <ul className="list-none p-0 m-0 flex flex-col gap-[1.25rem]">
          {reviews.map((review) => (
            <li key={review.id} className="bg-surface p-[1rem] border border-border rounded-[0.5rem]">
              <div className="flex flex-wrap items-center gap-[0.75rem] mb-[0.5rem]">
                <span className="font-semibold">
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

              {review.body ? (
                <p className="my-[0.5rem] mx-0 [overflow-wrap:anywhere]">{review.body}</p>
              ) : null}

              {review.photos.length > 0 ? (
                <ul className="list-none p-0 mt-[0.75rem] mx-0 mb-0 flex flex-wrap gap-[0.5rem]">
                  {review.photos.map((photo) => {
                    const canRemove = isAdmin || myReview?.id === review.id;

                    return (
                      <li key={photo.id} className="flex flex-col gap-[0.25rem]">
                        {/* next/image needs the blob host allowlisted in
                            next.config.ts, AND the host must be in the CSP img-src —
                            miss either and the photo is silently blocked. */}
                        <Image
                          src={photo.url}
                          alt={photo.alt}
                          width={photo.width}
                          height={photo.height}
                          sizes="(max-width: 640px) 50vw, 240px"
                          className="w-auto h-auto max-w-[240px] rounded-[0.375rem] object-cover"
                        />

                        {/* Removing ONE photo without deleting the whole review.
                            Without this the only way to take a photo down is to
                            delete everything you wrote — and a photo is the thing
                            most likely to have been posted by mistake. */}
                        {canRemove ? (
                          <form action={deletePhotoAction} className="build-photo-remove">
                            <input type="hidden" name="photoId" value={photo.id} />
                            <input type="hidden" name="slug" value={slug} />
                            <button
                              type="submit"
                              className={btnDanger}
                              aria-label={`Remove photo: ${photo.alt}`}
                            >
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {/* Rendered for the author or an admin. The server re-checks; this is
                  presentation, not authorization. */}
              {isAdmin || myReview?.id === review.id ? (
                <form action={deleteReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className={btnDanger}>
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
