import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * About — Sprint 23. Real copy, drafted for Keagan's review.
 *
 * PUBLIC-FACING COPY IS KEAGAN'S CALL (BUILD_PLAN.md §2). This is a draft grounded in
 * what the app actually does; every claim is true of the current build. The name
 * "Woodworking Plan" is the working placeholder — branding/domain (decision #8) is still
 * open, so this stays `robots: noindex` and the one contact line is a marked placeholder
 * to swap at launch. See DECISIONS_LOG.md 2026-07-14.
 */
export const metadata: Metadata = {
  title: 'About',
  description:
    'What Woodworking Plan is: a searchable catalog of woodworking plans with a full cut list, material list, tools, and a cost estimate on every one.',
  robots: { index: false, follow: false }, // Branding decision #8 still open.
};

export default function AboutPage() {
  return (
    <main id="main" className="page">
      <h1>About Woodworking Plan</h1>

      <p className="subtitle">
        A woodworking catalog where every plan carries the same structured detail &mdash;
        so you can actually compare what you&rsquo;re about to build.
      </p>

      <section>
        <h2>The idea</h2>
        <p>
          Most woodworking plans online are a photo, a paragraph, and a cut list buried in
          a PDF &mdash; if there&rsquo;s a cut list at all. Comparing two of them means
          reading two entirely different formats and guessing at the parts they leave out.
        </p>
        <p>
          Woodworking Plan takes a narrower bet: every plan in the catalog carries the{' '}
          <em>same</em> structured information &mdash; difficulty, realistic shop time, a
          cost band, the tools you need (and which are optional), a full material list, and
          a complete cut list in tape-measure fractions. Because it&rsquo;s all structured,
          you can search and filter it the way you&rsquo;d actually decide what to make:
          &ldquo;what can I build this weekend, with the tools I own, without a big lumber
          run?&rdquo;
        </p>
      </section>

      <section>
        <h2>What&rsquo;s here</h2>
        <ul className="prose-list">
          <li>
            <strong>Every plan, fully specified.</strong> Cut list, materials, tools, a
            step-by-step build, difficulty, time, and a cost tier &mdash; on all of them.
          </li>
          <li>
            <strong>Search and filters that match how you decide.</strong> Filter by
            category, difficulty, cost, time, and the tools you already own &mdash; that
            last one only shows plans you can actually build.
          </li>
          <li>
            <strong>A board-buying plan.</strong> The cut-list optimizer turns a plan&rsquo;s
            parts into how many boards of what size to buy, accounting for saw kerf and for
            ripping narrow parts from wider stock.
          </li>
          <li>
            <strong>Learning paths.</strong> Ordered sequences of projects that build skill,
            with a reason each one comes where it does.
          </li>
          <li>
            <strong>A real shopping list.</strong> Add the plans you&rsquo;re building and
            get one consolidated, printable materials list &mdash; or a per-plan breakdown.
          </li>
          <li>
            <strong>Built for the shop.</strong> It installs to your phone, works offline,
            and every plan has a clean print/PDF view for taping up next to the saw.
          </li>
        </ul>
      </section>

      <section>
        <h2>Where it&rsquo;s at</h2>
        <p>
          Woodworking Plan is in active development. It&rsquo;s free to use right now, with
          no ads and no affiliate links. It is not finished &mdash; the catalog is growing,
          and some rough edges are still being smoothed &mdash; and feedback genuinely
          shapes what gets built next.
        </p>
        <p className="muted">
          {/* PLACEHOLDER — update at launch alongside branding/domain (decision #8):
              product name, and a real contact method. */}
          Questions or found something broken? Reach out at{' '}
          <strong>hello@example.com</strong>{' '}
          <span className="muted">(placeholder &mdash; a real address is coming)</span>.
        </p>
      </section>

      <p className="subtitle">
        <Link href="/">Browse the plans &rarr;</Link>
      </p>
    </main>
  );
}
