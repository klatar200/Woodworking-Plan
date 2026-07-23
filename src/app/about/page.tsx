import type { Metadata } from 'next';
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)
import Link from 'next/link';
import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';
import { publicRobots } from '@/lib/seo';

/**
 * About — Sprint 23 copy, rebranded in Sprint 43 (branding #8 RESOLVED: Notch,
 * DECISIONS_LOG.md 2026-07-21). PUBLIC-FACING COPY IS KEAGAN'S CALL (BUILD_PLAN.md
 * §2) — every claim is true of the current build; the contact address is real now.
 */
export const metadata: Metadata = {
  title: 'About',
  description: `What ${BRAND_NAME} is: a searchable catalog of woodworking plans, each with a material list, tools, and a cost band — most with a full cut list too.`,
  robots: publicRobots, // follows the launch switch in @/lib/seo
};

export default function AboutPage() {
  return (
    <main id="main" className={`${page} page-wide`}>
      {/* QOL-K: the shell is page-wide (64rem) for consistency with the other pages, but
          long-form prose at that width runs ~120 chars/line. Constrain the reading column
          to a comfortable measure (~42rem, ~75 chars), centered within the wider shell. */}
      <div className="max-w-[42rem] mx-auto">
      <h1>About {BRAND_NAME}</h1>

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
          {BRAND_NAME} takes a narrower bet: every plan in the catalog carries the{' '}
          <em>same</em> structured information &mdash; difficulty, realistic shop time, a
          cost band, the tools you need (and which are optional), and a full material list,
          most with a complete cut list in tape-measure fractions. Because it&rsquo;s all
          structured,
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
          {BRAND_NAME} is in active development. It&rsquo;s free to use right now, with
          no ads and no affiliate links. It is not finished &mdash; the catalog is growing,
          and some rough edges are still being smoothed &mdash; and feedback genuinely
          shapes what gets built next.
        </p>
        <p className="muted">
          Questions or found something broken? Reach out at{' '}
          <strong>{CONTACT_EMAIL}</strong>.
        </p>
      </section>

      <p className="subtitle">
        <Link href="/browse">Browse the plans &rarr;</Link>
      </p>
      </div>
    </main>
  );
}
