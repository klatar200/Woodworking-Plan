import type { Metadata } from 'next';
import { page } from '@/lib/ui'; // Sprint 29: page-shell utilities (retains `page` class)
import Link from 'next/link';

/**
 * FAQ — Sprint 23. Real copy, drafted for Keagan's review.
 *
 * PUBLIC-FACING COPY IS KEAGAN'S CALL (BUILD_PLAN.md §2). Every answer here is true of
 * the current build — the free framing matches the launch-economics decision ($0, no
 * ads, no affiliate, no forever promise; DECISIONS_LOG.md 2026-07-13/14). Name is the
 * "Woodworking Plan" placeholder; contact is a marked placeholder. Stays noindex until
 * branding/domain (decision #8) lands.
 *
 * Rendered as a semantic <dl> so it reads as questions/answers to screen readers, not
 * just visual headings.
 */
export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Woodworking Plan — pricing, accounts, offline use, cost tiers, and how the plans work.',
  robots: { index: false, follow: false }, // Branding decision #8 still open.
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
        Yes. Woodworking Plan installs to your phone or desktop like an app and works
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
    <main id="main" className={page}>
      <h1>Frequently asked questions</h1>

      <dl className="faq">
        {FAQS.map((item) => (
          <div key={item.q} className="faq-item">
            <dt>{item.q}</dt>
            <dd>{item.a}</dd>
          </div>
        ))}
      </dl>

      <p className="subtitle">
        {/* PLACEHOLDER — real contact + product name land with branding/domain (#8). */}
        Didn&rsquo;t find your answer? Email{' '}
        <strong>hello@example.com</strong>{' '}
        <span className="muted">(placeholder &mdash; a real address is coming)</span>, or{' '}
        <Link href="/">browse the plans</Link>.
      </p>
    </main>
  );
}
