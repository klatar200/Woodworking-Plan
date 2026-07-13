/**
 * Star rating display — Sprint 10.
 *
 * ACCESSIBILITY: the stars are `aria-hidden`, and the real value is in text for a
 * screen reader. "★★★☆☆" read aloud is either silence or gibberish depending on the
 * reader — a rating nobody can hear is not a rating. Sprint 9 did an accessibility
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
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="star-rating">
      <span aria-hidden="true" className="stars">
        {'★'.repeat(full)}
        {half ? '⯨' : ''}
        {'☆'.repeat(empty)}
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
