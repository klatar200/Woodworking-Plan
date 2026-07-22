import Link from 'next/link';
import { Check } from 'lucide-react';
import { queryPlans, getPlanBySlug } from '@/lib/plans';
import {
  optimize,
  totalBoards,
  hasImpossibleParts,
  DEFAULT_OPTIONS,
  type Part,
} from '@/lib/cut-optimizer';
import { NAV_CATEGORIES } from '@/lib/nav-categories';
import { planCountCopy } from '@/lib/landing-copy';
import { CATALOG_PATH } from '@/lib/routes';
import { BRAND_TAGLINE } from '@/lib/brand';
import { PlanCard } from '@/components/plan-card';
import { LandingPlanPanel } from '@/components/landing-plan-panel';
import { btnPrimary, btnGhost } from '@/lib/ui';

/**
 * The marketing landing page — QOL-M Step 2 (2026-07-20). Replaces the Step-1 interim
 * redirect; the catalog lives at `/browse`.
 *
 * BUILT FROM REAL DATA where anything is presented as fact: the featured carousel is the
 * live Trending order, and the hero's "what a plan looks like" panel shows a REAL plan's
 * actual cut list and board-buying count (`getPlanBySlug` + the same `optimize()` the
 * catalog uses). No fabricated "staff picks", user counts, or testimonials.
 *
 * PUBLIC COPY IS A DRAFT (BUILD_PLAN.md §2). Branding #8 is RESOLVED (Notch, Sprint
 * 43); the tagline in the final CTA is DRAFT copy from `src/lib/brand.ts`. Every
 * claim here is true of the current app.
 *
 * The page is its own full-bleed layout (not the `page` shell): section backgrounds and
 * the carousels run edge-to-edge, while `.landing-wrap` bounds the content so it never
 * sprawls on a wide monitor (the "don't inflate to fill whitespace" fix). Headings use
 * `.font-display` (Fraunces, self-hosted via next/font — see layout.tsx).
 */
export const dynamic = 'force-dynamic';

/**
 * ── Sprint 40.5 (audit D2): the landing uses the SITE type + radius scale ──────────────
 *
 * This page was built from a mockup and arrived carrying its own dialect — 0.72/0.9/0.93/
 * 0.95/1.02/1.1/1.15rem text and 0.6/0.7/0.8/1.1rem radii, none of which appear anywhere
 * else in the app. Every value below is now a step on the shared scale (the substitution
 * table is in SPRINT_LOG.md). `tests/landing-scale.test.ts` enforces it, because the
 * failure mode is not one wrong page — it is the next person tuning the hero by eye and
 * re-introducing a parallel scale one value at a time.
 *
 *   type    0.75 · 0.875 · 0.9375 · 1 · 1.0625 · 1.125 · 1.25 · 1.5rem, plus clamp()
 *           for the display headings that must scale with the viewport
 *   radius  0.375 · 0.5 · 0.75 · 1rem, plus 2px (hairlines), 50% and 999px (pills)
 */
const wrap = 'mx-auto w-full max-w-[76rem] px-[1.5rem] sm:px-[2rem]';
const eyebrow =
  'inline-flex items-center gap-[0.45rem] text-[0.75rem] uppercase tracking-[0.09em] text-accent-text font-semibold before:content-[""] before:w-[1.4rem] before:h-[2px] before:bg-accent before:rounded-[2px]';
const sectionH2 = 'font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold mt-[0.5rem] mb-[0.4rem]';
const isq =
  'inline-flex items-center justify-center w-[2.9rem] h-[2.9rem] rounded-[0.5rem] bg-accent-tint border border-accent-tint-border text-accent-strong shrink-0';
const catPill =
  'inline-flex items-center border border-border rounded-[999px] px-[1.15rem] py-[0.6rem] text-[0.9375rem] font-medium text-fg no-underline bg-surface shadow-e1 whitespace-nowrap';
const sectionLead = 'text-muted text-[1rem] max-w-[52ch]';

// How many times each marquee repeats its content. A CSS marquee (translateX(-50%) on a
// track holding N identical copies) only looks seamless when the content still on screen at
// the loop point fills the viewport — i.e. one copy must be wide enough. Narrow items (text
// pills, trust chips) need more copies than wide ones (plan cards). The `[--speed]` on each
// track is scaled with its copy count so the visual scroll speed stays the same.
const MARQUEE_COPIES = 6; // narrow: trust chips + category pills
const PLAN_MARQUEE_COPIES = 4; // wide: featured plan cards

export default async function LandingPage() {
  // Sprint 40.2: `total` was already in this result and thrown away — the real catalog
  // size costs no extra query. See src/lib/landing-copy.ts for the floor rule.
  //
  // 🛑 THIS CALL MUST STAY UNFILTERED. `total` is what the page prints as the catalog
  // size, and it is the SAME number /browse shows in its results heading because both
  // read it off `queryPlans()`. `sort` and `perPage` are safe — they change order and
  // page size, not how many rows match — but adding `filters` or `query` here (say, to
  // make the featured carousel show only one category) would silently turn the headline
  // into a subset count that still renders and still looks live. Guarded by
  // tests/landing-copy.test.ts; if the carousel ever needs narrowing, give it its own
  // query and keep this one whole.
  const { plans: featured, total } = await queryPlans({ sort: 'trending', perPage: 8 });
  const count = planCountCopy(total);

  // Two REAL "plan panels" drive the hero and the "what a plan looks like" section — a real
  // cut list beside a real board-buying plan. Pull full data for the first few Trending plans
  // and keep the ones whose optimizer result is CLEAN (no part longer than a stock board) and
  // detailed enough to read as a project, so the drawn bars and the "buy N boards" count are
  // both honest. getPlanBySlug is request-cached, so the featured cards don't re-query.
  const candidates = await Promise.all(
    featured.slice(0, 6).map((f) => getPlanBySlug(f.slug)),
  );
  const showcases: Array<{
    plan: NonNullable<Awaited<ReturnType<typeof getPlanBySlug>>>;
    groups: ReturnType<typeof optimize>;
    boards: number;
  }> = [];
  for (const plan of candidates) {
    if (!plan || plan.cutList.length < 3) continue;
    const parts: Part[] = plan.cutList.map((item) => ({
      id: item.id,
      label: item.part,
      quantity: item.quantity,
      thicknessIn: item.thicknessIn,
      widthIn: item.widthIn,
      lengthIn: item.lengthIn,
      material: item.material,
    }));
    const groups = optimize(parts, DEFAULT_OPTIONS);
    if (hasImpossibleParts(groups)) continue;
    showcases.push({ plan, groups, boards: totalBoards(groups) });
    if (showcases.length === 2) break;
  }
  const heroShow = showcases[0] ?? null;
  // The "what a plan looks like" panel uses the SECOND clean plan (a different project from
  // the hero); if only one qualified, it reuses the hero's rather than showing nothing.
  const detailShow = showcases[1] ?? heroShow;

  return (
    <main id="main">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="landing-hatch relative overflow-hidden border-b border-border">
        <div className={`${wrap} grid items-center gap-[2.5rem] py-[3.5rem] lg:grid-cols-[1.02fr_0.98fr] lg:py-[4.5rem]`}>
          <div>
            <span className={eyebrow}>The woodworking plan catalog</span>
            <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.04] font-semibold mt-[1rem] mb-[1.1rem]">
              Plans you can <em className="not-italic text-accent-text">actually</em> compare.
            </h1>
            <p className="text-[1.125rem] text-muted max-w-[42ch] mb-[1.75rem]">
              Every plan carries the same structured detail &mdash; a full cut list, a
              material list, the tools you need, and a cost band. Decide before you drive
              to the lumberyard.
            </p>
            <div className="flex flex-wrap gap-[0.75rem]">
              <Link href={CATALOG_PATH} className={btnPrimary}>
                Browse the plans →
              </Link>
              <Link href="/sign-up" className={btnGhost}>
                Create a free account
              </Link>
            </div>
            <p className="mt-[1.5rem] text-[0.9375rem] text-muted-2">
              Free &mdash; no ads, no affiliate links · Installs to your phone, works offline
            </p>
          </div>

          {/* Real showcase plan: its actual cut list + a real board-buying plan, drawn. */}
          {heroShow ? (
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-[-8%_-6%_-12%_6%] rounded-[50%] bg-[radial-gradient(60%_60%_at_60%_40%,var(--accent)_0%,transparent_70%)] opacity-[0.35] blur-[28px]"
              />
              <div className="relative">
                <LandingPlanPanel
                  plan={heroShow.plan}
                  groups={heroShow.groups}
                  boards={heroShow.boards}
                  rotate
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── TRUST MARQUEE ────────────────────────────────────────────────── */}
      <div className="landing-marquee landing-marquee-on-surface border-y border-border bg-surface">
        <ul className="landing-marquee-track list-none m-0 py-[0.95rem] px-0 [--speed:96s] [--gap:2.75rem]">
          {/* MARQUEE_COPIES copies (not 2): a CSS loop only reads as seamless when the
              content BEHIND the loop point still fills the screen. With few, narrow items
              one copy is narrower than a wide viewport, so 2 copies leave a gap at the seam
              that "jerks" on reset. Duration is scaled with the copy count to hold speed. */}
          {Array.from({ length: MARQUEE_COPIES }, (_, set) =>
            trustItems(count.chip).map((item, i) => (
              <li
                key={`${set}-${i}`}
                inert={set !== 0}
                aria-hidden={set !== 0 ? true : undefined}
                className="inline-flex items-center gap-[0.55rem] text-[0.9375rem] text-muted-2 whitespace-nowrap"
              >
                {item.icon ? (
                  <Check size={16} className="text-ok shrink-0" aria-hidden="true" />
                ) : null}
                {item.strong ? <strong className="text-fg">{item.text}</strong> : item.text}
              </li>
            )),
          )}
        </ul>
      </div>

      {/* ── WHAT A PLAN LOOKS LIKE (real panel + explainer) ──────────────── */}
      {detailShow ? (
        <section className={`${wrap} py-[4rem]`}>
          <span className={eyebrow}>What a plan looks like</span>
          <h2 className={sectionH2}>Not a photo and a paragraph. The whole thing.</h2>
          <p className={`${sectionLead} mb-[2rem]`}>
            Every plan is fully specified &mdash; so you can see exactly what to cut, what to
            buy, and whether you can build it with the tools you own.
          </p>
          <div className="grid gap-[2.5rem] items-center lg:grid-cols-[1.05fr_0.95fr]">
            <LandingPlanPanel
              plan={detailShow.plan}
              groups={detailShow.groups}
              boards={detailShow.boards}
            />
            <ul className="list-none m-0 p-0">
              {NOTES.map((n) => (
                <li key={n.title} className="flex gap-[0.85rem] items-start my-[1.15rem]">
                  <span className="inline-flex items-center justify-center w-[2.5rem] h-[2.5rem] rounded-[0.5rem] bg-accent-tint border border-accent-tint-border text-accent-strong shrink-0">
                    {n.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-[1rem] font-semibold m-0 mb-[0.15rem]">
                      {n.title}
                    </h3>
                    <p className="m-0 text-muted text-[0.9375rem]">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ── DIFFERENTIATORS ──────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <div className={`${wrap} py-[3.5rem]`}>
          <span className={eyebrow}>Why this catalog</span>
          <h2 className={sectionH2}>What sets it apart</h2>
          <p className={`${sectionLead} mb-[2rem]`}>
            Every claim here is something the app does today.
          </p>
          <ul className="list-none m-0 p-0 grid gap-[1.1rem] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="bg-surface border border-border rounded-[0.75rem] p-[1.4rem] shadow-e1 transition-[translate,box-shadow] duration-200 hover:-translate-y-[4px] hover:shadow-e3 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className={isq}>{f.icon}</span>
                <h3 className="font-display text-[1.125rem] font-semibold mt-[0.85rem] mb-[0.4rem]">
                  {f.title}
                </h3>
                <p className="m-0 text-muted text-[0.9375rem]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── HOW IT WORKS (timeline) ──────────────────────────────────────── */}
      <section className={`${wrap} py-[3.5rem]`}>
        <span className={eyebrow}>How it works</span>
        <h2 className={sectionH2}>Find it, buy for it, build it</h2>
        <ol className="landing-timeline list-none m-0 p-0 mt-[1.5rem] grid gap-[1.25rem] lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              // Sprint 40.4 (audit V2): 6px → 4px, the lift every other card in the app
              // uses. Two hover distances is a difference nobody chose.
              className="landing-panel relative z-[1] rounded-[0.75rem] p-[1.4rem] transition-transform duration-200 hover:-translate-y-[4px] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="flex items-center gap-[0.75rem] mb-[0.65rem]">
                <span className="inline-flex items-center justify-center w-[1.7rem] h-[1.7rem] rounded-[50%] bg-fg text-surface font-display font-semibold text-[0.9375rem]">
                  {i + 1}
                </span>
                <span className={isq} style={{ width: '2.4rem', height: '2.4rem' }}>
                  {s.icon}
                </span>
              </div>
              <h3 className="font-display text-[1.125rem] font-semibold mt-[0.4rem] mb-[0.3rem]">
                {s.title}
              </h3>
              <p className="m-0 text-muted text-[0.9375rem]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── FEATURED (real plans) + CATEGORIES, as revolving carousels ───── */}
      {featured.length > 0 ? (
        <section className="landing-band-inset border-y border-border bg-surface">
          <div className={`${wrap} pt-[3.5rem] pb-[2rem]`}>
            <span className={eyebrow}>Featured plans</span>
            <h2 className={sectionH2}>Start with something buildable</h2>
            <p className={`${sectionLead} mb-0`}>
              Straight from the catalog&rsquo;s Trending order &mdash; real plans, each
              fully specified.
            </p>
          </div>

          {/* ⚖️ Sprint 40.1 (audit A3): `landing-marquee-swipe` turns this band into a
              native scroll-snap row below `lg` — see globals.css. A marquee of LINKS is
              the worst motion on the page for a touch user: unpausable (no hover) and the
              card moves out from under the thumb reaching for it. Desktop is unchanged. */}
          <div className="landing-marquee landing-marquee-swipe landing-marquee-on-surface pb-[2rem]">
            <ul className="landing-marquee-track list-none m-0 p-0 px-[1.5rem] [--speed:120s]">
              {Array.from({ length: PLAN_MARQUEE_COPIES }, (_, set) =>
                featured.map((plan) => (
                  // Only copy 0 is the real, interactive card; the rest are visual loop
                  // duplicates — inert + aria-hidden so they aren't extra tab stops and a
                  // screen reader doesn't read the carousel N times. Sprint 40.1: that
                  // `inert` is also what the mobile swipe-row CSS selects on to drop the
                  // duplicates, so the two can never disagree about which copies are real.
                  <PlanCard
                    key={`f${set}-${plan.id}`}
                    plan={plan}
                    decorative={set !== 0}
                  />
                )),
              )}
            </ul>
          </div>

          <div className={`${wrap} pb-[1rem]`}>
            <div className="text-[0.75rem] uppercase tracking-[0.07em] text-muted font-semibold mb-[0.7rem]">
              Or browse by category
            </div>
          </div>
          <div className="landing-marquee landing-marquee-on-surface pb-[3.5rem]">
            {/* Scrolls the OPPOSITE way to the featured carousel above (reverse) — a
                deliberate counter-motion so the two rows don't read as one moving block. */}
            <ul className="landing-marquee-track landing-marquee-reverse list-none m-0 p-0 px-[1.5rem] [--speed:102s]">
              {Array.from({ length: MARQUEE_COPIES }, (_, set) => {
                // Only copy 0 is interactive; the rest are visual loop duplicates.
                const dup = set !== 0;
                return [
                  <li key={`${set}-all`} inert={dup} aria-hidden={dup ? true : undefined}>
                    <Link href={CATALOG_PATH} className={catPill}>
                      All plans →
                    </Link>
                  </li>,
                  ...NAV_CATEGORIES.map((c) => (
                    <li
                      key={`${set}-${c.slug}`}
                      inert={dup}
                      aria-hidden={dup ? true : undefined}
                    >
                      <Link href={`${CATALOG_PATH}?category=${c.slug}`} className={catPill}>
                        {c.name}
                      </Link>
                    </li>
                  )),
                ];
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────────── */}
      <section className={`${wrap} py-[3.5rem]`}>
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] rounded-[1rem] border border-accent-tint-border overflow-hidden shadow-e3">
          {/* Sprint 44: the cream-orange radial became a sage wash toward the forest
              accent. The plane glyph strokes `currentColor` (a `var()` doesn't resolve
              in an SVG presentation attribute; currentColor does) so it tracks
              `text-accent-strong` — 7.56:1 on the light stop, comfortably graphic-safe. */}
          <div className="relative min-h-[14rem] bg-[radial-gradient(130%_130%_at_25%_15%,#dcead5,var(--accent)_120%)] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[7rem] h-[7rem] text-accent-strong opacity-90 -rotate-[8deg] drop-shadow-[0_8px_14px_rgba(60,42,24,0.25)]"
              aria-hidden="true"
            >
              <path d="M2 20l4-1 9-9-3-3-9 9z" />
              <path d="M12 7l3 3" />
              <path d="M14 5l5-3 3 3-3 5-2-2" />
            </svg>
          </div>
          <div className="bg-surface p-[2.25rem]">
            <span className={eyebrow}>Who it&rsquo;s for</span>
            <h2 className="font-display text-[1.5rem] font-semibold mt-[0.5rem] mb-[0.7rem]">
              For the &ldquo;what can I build this weekend?&rdquo; woodworker.
            </h2>
            <p className="text-muted text-[1rem] mb-[1.1rem]">
              You&rsquo;ve got a Saturday, a pile of 2×4s, and a tape measure. You
              don&rsquo;t want a PDF with the cut list buried on page 7 &mdash; you want to
              know what to build and what to buy. That&rsquo;s the whole idea.
            </p>
            <ul className="list-none m-0 p-0">
              {AUDIENCE.map((a) => (
                <li key={a} className="flex items-center gap-[0.75rem] my-[0.7rem] text-[1rem]">
                  <span
                    className="inline-flex items-center justify-center w-[2.2rem] h-[2.2rem] rounded-[0.5rem] bg-accent-tint text-accent-strong shrink-0"
                    aria-hidden="true"
                  >
                    <Check size={16} />
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className={`${wrap} py-[3.5rem] max-w-[44rem]`}>
          <span className={eyebrow}>Before you ask</span>
          <h2 className={`${sectionH2} mb-[1.1rem]`}>Quick answers</h2>
          {/* Sprint 40.3 (audit V2): one accordion dialect across the site. This was a
              bare bold <summary> with no affordance while /faq had a rotating chevron —
              two disclosure designs on the same site, three clicks apart. Lifted verbatim
              from /faq, including its degradation argument: `::details-content` +
              `interpolate-size` is new enough to be absent, and where it is absent the
              panel simply snaps open — <details> itself supplies the closed state, so
              nothing is hidden with no way to reveal it. The chevron's transform
              transition works everywhere. Both are off under motion-reduce. */}
          <div className="[interpolate-size:allow-keywords]">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="group border-b border-border [&::details-content]:h-0 [&::details-content]:overflow-hidden [&::details-content]:transition-[height,content-visibility] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:[transition-behavior:allow-discrete] open:[&::details-content]:h-auto motion-reduce:[&::details-content]:transition-none"
              >
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
                  <span>{f.q}</span>
                </summary>

                {/* Indented to the question's text, not the chevron — as on /faq. */}
                <p className="m-0 pb-[1.25rem] pl-[1.75rem] leading-[1.6] text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className={`${wrap} py-[3.5rem]`}>
        {/* Sprint 44: the glow over the always-dark panel is OAK (was the orange accent
            at the same alpha) — a warm glow that harmonises with the deliberately-kept
            brown-black panel AND survives the dark-theme deferral. The panel gradient
            itself stays: it belongs to the dark theme's family, which re-palettes later. */}
        <div className="relative overflow-hidden text-center rounded-[1rem] px-[1.5rem] py-[3.5rem] bg-[linear-gradient(160deg,#2a2320,#17140f)] text-[#f0ece4] shadow-e3 before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(50%_120%_at_50%_-20%,rgba(196,165,116,0.35),transparent_60%)]">
          {/* DRAFT copy (Sprint 43) — the brand-sheet tagline, in oak: text-safe HERE
              (6.61:1 on this dark panel) though graphic-only on light backgrounds. */}
          <p className="relative m-0 mb-[0.75rem] text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-oak">
            {BRAND_TAGLINE}
          </p>
          <h2 className="relative font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold m-0 mb-[0.5rem]">
            Find your next project.
          </h2>
          <p className="relative text-[#c9c2b6] m-0 mb-[1.6rem]">
            {count.sentence} Free to browse &mdash; no account required.
          </p>
          {/* Sprint 44: `text-accent-fg`, not the old `text-[#1a1a1a]` literal — with
              the dark forest accent, hardcoded ink would be a silent contrast failure
              no token test could see. */}
          <Link
            href={CATALOG_PATH}
            className="relative inline-flex items-center min-h-[2.9rem] px-[1.25rem] rounded-[0.5rem] font-semibold no-underline bg-accent text-accent-fg border border-accent shadow-e2"
          >
            Browse the plans →
          </Link>
        </div>
      </section>
    </main>
  );
}

// ── static content (placeholder copy; icons are inline line-SVGs) ──────────────
const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  // Decorative icons paired with a visible text label — hidden from assistive tech.
  'aria-hidden': true,
};

// Sprint 40.2: the lead chip carries the live catalog size (see src/lib/landing-copy.ts).
// A function, not a const, so the number cannot be re-hardcoded here by accident.
const trustItems = (countChip: string) => [
  { text: countChip, strong: true, icon: false },
  { text: 'Free — no ads, no affiliate links', icon: true },
  { text: 'Installs to your phone, works offline', icon: true },
  { text: 'Cut lists in tape-measure fractions', icon: true },
  { text: 'A board-buying plan on every project', icon: true },
];

const FEATURES = [
  {
    title: 'A board-buying plan',
    body: "The cut-list optimizer turns a plan's parts into how many boards of what size to buy — accounting for saw kerf and ripping narrow parts from wider stock.",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.5rem] h-[1.5rem]">
        <path d="M3 7h18M3 12h18M3 17h11" />
        <path d="M18 15l3 2-3 2" />
      </svg>
    ),
  },
  {
    title: 'Filter by tools you own',
    body: 'Tick your tools once and see only the plans you can actually build — essential tools only.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.5rem] h-[1.5rem]">
        <path d="M4 7h16v13H4z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        <path d="M4 12h16" />
      </svg>
    ),
  },
  {
    title: 'Honest cost bands',
    body: 'Compare by a $–$$$$$ band, not a made-up dollar figure that moves with region and season.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.5rem] h-[1.5rem]">
        <path d="M20 12l-8 8-9-9V4h7z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </svg>
    ),
  },
  {
    title: 'Built for the shop',
    body: 'Installs to your phone, works offline, and prints clean in tape-measure fractions.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.5rem] h-[1.5rem]">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  {
    title: 'One shopping list',
    body: "Add materials across the plans you're building into a single consolidated list.",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.5rem] h-[1.5rem]">
        <path d="M3 4h2l2.4 12.4a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
    ),
  },
  {
    title: 'Learning paths',
    body: 'Ordered project sequences that build skill — each chosen to teach what the next one assumes you know.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.5rem] h-[1.5rem]">
        <path d="M3 8l9-4 9 4-9 4z" />
        <path d="M7 10v5c0 1 2 2 5 2s5-1 5-2v-5" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: 'Find a plan',
    body: 'Search or filter by category, difficulty, cost, time, and the tools you own.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: 'Get the buying plan',
    body: 'See exactly which boards to buy and add materials to one shopping list.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <path d="M3 4h2l2.4 12.4a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
    ),
  },
  {
    title: 'Build it',
    body: 'Follow the steps on your phone — offline, or printed in tape-measure fractions.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <path d="M14 3l7 7-4 4-7-7z" />
        <path d="M10 7 3 14v4h4l7-7" />
      </svg>
    ),
  },
];

// The explainer list beside the "what a plan looks like" panel.
const NOTES = [
  {
    title: 'Structured, every time',
    body: 'Difficulty, real shop time, tools (and which are optional), a full material list — so two plans compare directly.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <rect x="3" y="10" width="18" height="4" rx="1" />
        <rect x="3" y="16" width="18" height="4" rx="1" />
      </svg>
    ),
  },
  {
    title: 'A buying plan, not just a cut list',
    body: 'How many boards of what size to actually put in the truck — kerf and ripping accounted for.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <path d="M3 7h18M3 12h18M3 17h10" />
        <path d="M17 15l3 2-3 2" />
      </svg>
    ),
  },
  {
    title: 'Fractions, not decimals',
    body: '3/4", 13/16" — the numbers your tape measure actually shows.',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <path d="M3 6h18v12H3z" />
        <path d="M7 6v3M11 6v5M15 6v3M19 6v5" />
      </svg>
    ),
  },
  {
    title: 'Own the tools?',
    body: "Tick yours once and the catalog hides anything you can't build.",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-[1.25rem] h-[1.25rem]">
        <path d="M4 7h16v13H4z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
];

const AUDIENCE = [
  'Save plans and roll materials into one shopping list.',
  'Log your builds and leave a review with photos.',
  'Free, and it works with one bar of signal in the shop.',
];

const FAQS = [
  {
    q: 'Is it free?',
    a: 'Yes — free to browse and use, with no ads and no affiliate links.',
  },
  {
    q: 'Do I need an account?',
    a: "No account to browse. One's only needed to save plans, build a shopping list, or log a build.",
  },
  {
    q: 'Does it work offline?',
    a: 'Yes — install it to your phone and your saved plans, cut lists, and shopping list work with no signal.',
  },
];
