import type { Metadata } from 'next';
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)
import Link from 'next/link';
import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';
import { publicRobots } from '@/lib/seo';

/**
 * FAQ — Sprint 23. Real copy, drafted for Keagan's review.
 *
 * PUBLIC-FACING COPY IS KEAGAN'S CALL (BUILD_PLAN.md §2). Every answer here is true of
 * the current build — the free framing matches the launch-economics decision ($0, no
 * ads, no affiliate, no forever promise; DECISIONS_LOG.md 2026-07-13/14). Rebranded to
 * Notch in Sprint 43 (branding #8 RESOLVED); contact is the real address from
 * `src/lib/brand.ts`. Stays noindex until Keagan's go-live call.
 *
 * QOL-C (2026-07-19) — rendered as an ACCORDION: one native <details>/<summary> per
 * question. No copy changed; `robots: noindex` stays until branding decision #8.
 *
 * WHY <details> AND NOT THE OLD <dl>. Every disclosure in this codebase is a native
 * <details> for the same reason — FilterDisclosure, MobileNav, InstructionsDisclosure,
 * OverflowMenu — it opens and closes with NO JAVASCRIPT, and gets correct keyboard and
 * screen-reader behaviour for free. The Q→A association survives the change and
 * arguably improves: <summary> is announced as a disclosure whose expanded content IS
 * the answer, which is a stronger programmatic link than a <dt> sitting next to a <dd>.
 * (Nesting <details> inside a <dl> is not an option: a <dl> may only contain dt/dd, and
 * the answer would have to live inside the <dt> to be inside the disclosure.) The
 * questions were never headings, so no heading level is lost.
 *
 * THE ANIMATION IS A PROGRESSIVE ENHANCEMENT, deliberately. The height transition uses
 * `::details-content` + `interpolate-size: allow-keywords`, which is new enough that
 * this repo already refused to bet the FILTER UI on it (see filter-disclosure.tsx).
 * That judgement was right there and does not apply here: if a browser lacks it, the
 * panel simply snaps open — the content is never unreachable, only unanimated. The
 * chevron rotation is a plain transform transition and works everywhere, so most
 * people see motion either way. Both are switched off under
 * `prefers-reduced-motion: reduce` (WCAG 2.3.3), matching the skeleton-loading rule.
 */
export const metadata: Metadata = {
  title: 'FAQ',
  description: `Frequently asked questions about ${BRAND_NAME} — pricing, accounts, offline use, cost tiers, and how the plans work.`,
  robots: publicRobots, // follows the launch switch in @/lib/seo
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Is it free?',
    a: (
      <>
        Yes &mdash; it&rsquo;s free to use right now, with <strong>no ads and no affiliate
        links</strong>. Pricing isn&rsquo;t decided yet, so we&rsquo;re not promising it
        stays free forever; if that ever changes, it won&rsquo;t be a surprise sprung on
        you.
      </>
    ),
  },
  {
    q: 'Do I need an account?',
    a: (
      <>
        No &mdash; you can browse, search, and read every plan (including the full cut list
        and steps) without signing in. An account, with email or Google, unlocks the parts
        that are personal to you: saving plans, likes, reviews and build photos, your
        shopping list, and downloading your library for offline use.
      </>
    ),
  },
  {
    q: 'Why do prices show as $ to $$$$$ instead of real dollar amounts?',
    a: (
      <>
        Because a precise dollar figure would be a number we&rsquo;d only be pretending to
        know. Lumber prices swing with your region, the species, and the season, so a
        &ldquo;$187.50&rdquo; on a plan would be wrong for most people most of the time. A
        band &mdash; from <strong>$</strong> to <strong>$$$$$</strong> &mdash; tells you the
        decision-relevant thing (is this a cheap project or not?) without the false
        precision.
      </>
    ),
  },
  {
    q: 'Can I use it in the shop, without signal?',
    a: (
      <>
        Yes. {BRAND_NAME} installs to your phone or desktop like an app and works
        offline. Any plan you&rsquo;ve opened is cached for offline reading, and you can
        explicitly download your saved library &mdash; plans, their print views, and your
        shopping list &mdash; for a trip to the workshop or the hardware store. Every plan
        also has a clean print / &ldquo;Save as PDF&rdquo; view built for paper.
      </>
    ),
  },
  {
    q: 'How does the shopping list work?',
    a: (
      <>
        Open a plan and choose <strong>Add to shopping list</strong> &mdash; it&rsquo;s a
        separate, deliberate action from saving, so your list stays what you&rsquo;re
        actually buying for, not everything you&rsquo;ve ever bookmarked. You can view it as
        one combined, buyable list (quantities merged, grouped by unit) or broken down by
        plan. Identical items are combined only when they&rsquo;re truly identical &mdash;
        two different screw sizes are never merged into one confident, wrong quantity.
      </>
    ),
  },
  {
    q: 'Are the measurements and cut lists reliable?',
    a: (
      <>
        Every plan is hand-authored with a complete cut list in tape-measure fractions
        (13/16&Prime;, not 0.8125&Prime;). That said, wood moves, stock varies, and a
        mistake in your shop is yours to eat &mdash; so measure your own material, dry-fit
        before glue, and treat the plan as a well-specified starting point, not gospel.
        Follow the safety guidance for your tools; some of these projects involve saws and
        sharp edges.
      </>
    ),
  },
  {
    q: 'Can I submit my own plans?',
    a: (
      <>
        Not yet. Community-submitted plans are something we may add later, but publishing
        build instructions under the site&rsquo;s name carries real responsibility, so it
        isn&rsquo;t open until it can be done carefully. For now the catalog is curated.
      </>
    ),
  },
  {
    q: 'What do you do with my data and my build photos?',
    a: (
      <>
        Accounts are handled by our sign-in provider; we store what the features need
        &mdash; which plans you saved and liked, your reviews, your shopping list. Build
        photos you upload are re-encoded and have their location (GPS) data stripped before
        they&rsquo;re stored, so a phone photo of your workbench never publishes your home
        address. You can delete your reviews and photos, and deleting your account removes
        your data.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <main id="main" className={`${page} page-wide`}>
      {/* QOL-K: page-wide shell for consistency, but the Q&A reads as long-form text, so
          the column is constrained to a comfortable measure (~42rem) centered within it. */}
      <div className="max-w-[42rem] mx-auto">
      <h1>Frequently asked questions</h1>

      {/* `interpolate-size: allow-keywords` is what makes a transition TO `height: auto`
          possible at all; it sits on the container so one declaration covers every item. */}
      <div className="my-[1.5rem] [interpolate-size:allow-keywords]">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group border-b border-border last:border-b-0 [&::details-content]:h-0 [&::details-content]:overflow-hidden [&::details-content]:transition-[height,content-visibility] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:[transition-behavior:allow-discrete] open:[&::details-content]:h-auto motion-reduce:[&::details-content]:transition-none"
          >
            {/* list-none kills the default triangle; the chevron below is the affordance
                and it can be animated, which the UA marker cannot. */}
            <summary className="list-none [&::-webkit-details-marker]:hidden flex items-start gap-[0.75rem] py-[1.25rem] cursor-pointer font-semibold text-[1.0625rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2">
              <svg
                className="shrink-0 mt-[0.3rem] text-muted transition-transform duration-200 ease-out group-open:rotate-90 motion-reduce:transition-none"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 2l4 4-4 4" />
              </svg>
              <span>{item.q}</span>
            </summary>

            {/* Indented to the question's text, not the chevron. */}
            <div className="pb-[1.25rem] pl-[1.75rem] leading-[1.6]">{item.a}</div>
          </details>
        ))}
      </div>

      <p className="subtitle">
        Didn&rsquo;t find your answer? Email <strong>{CONTACT_EMAIL}</strong>, or{' '}
        <Link href="/browse">browse the plans</Link>.
      </p>
      </div>
    </main>
  );
}
