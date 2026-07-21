import { Star, StarHalf } from 'lucide-react';

/**
 * Star rating display — Sprint 10 (SVG stars 2026-07-20, replacing the ★/☆ glyphs).
 *
 * ACCESSIBILITY: the stars are `aria-hidden`, and the real value is in text for a
 * screen reader. A row of star glyphs read aloud is either silence or gibberish depending
 * on the reader — a rating nobody can hear is not a rating. Sprint 9 did an accessibility
 * pass; this feature is not going to undo it.
 */
export function StarRating({
  average,
  count,
}: {
  average: number | null;
  count: number;
}) {
  // No reviews means NO rating — not a zero. Rendering an unreviewed plan as zero
  // stars would libel it, and it is exactly the plan that most needs a first review.
  if (average === null || count === 0) {
    return <span className="muted">No reviews yet</span>;
  }

  const rounded = Math.round(average * 2) / 2; // nearest half
  const full = Math.floor(rounded);
  const half = rounded % 1 !== 0;

  return (
    <span className="inline-flex items-center gap-[0.4rem]">
      {/* `stars` class retained — `.plan-rating a:hover .stars` targets it. */}
      <span aria-hidden="true" className="stars inline-flex items-center text-accent-strong">
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          if (n <= full) {
            return <Star key={i} size={15} fill="currentColor" stroke="currentColor" />;
          }
          if (half && n === full + 1) {
            return (
              <span key={i} className="relative inline-flex">
                <Star size={15} stroke="currentColor" fill="none" />
                <StarHalf
                  size={15}
                  fill="currentColor"
                  stroke="currentColor"
                  className="absolute inset-0"
                />
              </span>
            );
          }
          return <Star key={i} size={15} stroke="currentColor" fill="none" />;
        })}
      </span>
      <span className="visually-hidden">
        Rated {average.toFixed(1)} out of 5 from {count} {count === 1 ? 'review' : 'reviews'}
      </span>
      <span aria-hidden="true" className="muted">
        {average.toFixed(1)} ({count})
      </span>
    </span>
  );
}
