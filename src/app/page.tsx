import Link from 'next/link';
import { queryPlans, getPlanBySlug } from '@/lib/plans';
import {
  optimize,
  totalBoards,
  hasImpossibleParts,
  DEFAULT_OPTIONS,
  type Part,
} from '@/lib/cut-optimizer';
import { NAV_CATEGORIES } from '@/lib/nav-categories';
import { CATALOG_PATH } from '@/lib/routes';
import {
  costTierSymbol,
  difficultyLabel,
  formatInches,
  formatTimeRange,
} from '@/lib/format';
import { PlanCard } from '@/components/plan-card';
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
 * PUBLIC COPY IS A DRAFT (BUILD_PLAN.md §2). The brand name is the "Woodworking Plan"
 * placeholder pending decision #8; every claim here is true of the current app.
 *
 * The page is its own full-bleed layout (not the `page` shell): section backgrounds and
 * the carousels run edge-to-edge, while `.landing-wrap` bounds the content so it never
 * sprawls on a wide monitor (the "don't inflate to fill whitespace" fix). Headings use
 * `.font-display` (Fraunces, self-hosted via next/font — see layout.tsx).
 */
export const dynamic = 'force-dynamic';

const wrap = 'mx-auto w-full max-w-[76rem] px-[1.5rem] sm:px-[2rem]';
const eyebrow =
  'inline-flex items-center gap-[0.45rem] text-[0.72rem] uppercase tracking-[0.09em] text-accent-strong font-semibold before:content-[""] before:w-[1.4rem] before:h-[2px] before:bg-accent before:rounded-[2px]';
const sectionH2 = 'font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold mt-[0.5rem] mb-[0.4rem]';
const chip =
  'inline-flex items-center text-[0.75rem] border border-border rounded-[999px] px-[0.6rem] py-[0.18rem] text-muted whitespace-nowrap';
const isq =
  'inline-flex items-center justify-center w-[2.9rem] h-[2.9rem] rounded-[0.7rem] bg-accent-tint border border-accent-tint-border text-accent-strong shrink-0';
const catPill =
  'inline-flex items-center border border-border rounded-[999px] px-[1.15rem] py-[0.6rem] text-[0.95rem] font-medium text-fg no-underline bg-surface shadow-e1 whitespace-nowrap';

export default async function LandingPage() {
  const { plans: featured } = await queryPlans({ sort: 'trending', perPage: 8 });
  const showcase = featured[0] ? await getPlanBySlug(featured[0].slug) : null;

  // The hero panel's honest "buy N boards" line — the SAME optimizer the catalog uses.
  let boardCount: number | null = null;
  if (showcase && showcase.cutList.length > 0) {
    const parts: Part[] = showcase.cutList.map((item) => ({
      id: item.id,
      label: item.part,
      quantity: item.quantity,
      thicknessIn: item.thicknessIn,
      widthIn: item.widthIn,
      lengthIn: item.lengthIn,
      material: item.material,
    }));
    const groups = optimize(parts, DEFAULT_OPTIONS);
    boardCount = hasImpossibleParts(groups) ? null : totalBoards(groups);
  }

  return (
    <main id="main">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(60%_90%_at_92%_0%,var(--accent-tint)_0%,transparent_60%)]">
        <div className={`${wrap} grid items-center gap-[2.5rem] py-[3.5rem] lg:grid-cols-[1.02fr_0.98fr] lg:py-[4.5rem]`}>
          <div>
            <span className={eyebrow}>The woodworking plan catalog</span>
            <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.04] font-semibold mt-[1rem] mb-[1.1rem]">
              Plans you can <em className="not-italic text-accent-strong">actually</em> compare.
            </h1>
            <p className="text-[1.15rem] text-muted max-w-[42ch] mb-[1.75rem]">
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
            <p className="mt-[1.5rem] text-[0.9rem] text-muted-2">
              Free &mdash; no ads, no affiliate links · Installs to your phone, works offline
            </p>
          </div>

          {/* Real showcase plan: its actual cut list + a real board count. */}
          {showcase ? (
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-[-8%_-6%_-12%_6%] rounded-[50%] bg-[radial-gradient(60%_60%_at_60%_40%,var(--accent)_0%,transparent_70%)] opacity-[0.35] blur-[28px]"
              />
              <div className="relative bg-surface border border-border border-b-border-strong rounded-[0.85rem] overflow-hidden shadow-e3">
                <div className="p-[1rem_1.15rem] border-b border-border">
                  <span className="text-[0.7rem] uppercase tracking-[0.07em] text-muted">
                    {showcase.category.name}
                  </span>
                  <h2 className="font-display text-[1.2rem] font-semibold mt-[0.25rem] mb-[0.55rem] normal-case tracking-normal text-fg">
                    {showcase.title}
                  </h2>
                  <div className="flex flex-wrap gap-[0.35rem]">
                    <span className={chip}>{difficultyLabel(showcase.difficulty)}</span>
                    <span className={chip}>{costTierSymbol(showcase.costTier)}</span>
                    <span className={chip}>
                      {formatTimeRange(showcase.timeMinMinutes, showcase.timeMaxMinutes)}
                    </span>
                  </div>
                </div>
                <div className="p-[0.95rem_1.15rem]">
                  <div className="text-[0.7rem] uppercase tracking-[0.07em] text-muted font-semibold mb-[0.5rem]">
                    Cut list
                  </div>
                  <table className="w-full border-collapse text-[0.82rem]">
                    <tbody>
                      {showcase.cutList.slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td className="py-[0.22rem] border-b border-border">
                            {item.part} ×{item.quantity}
                          </td>
                          <td className="py-[0.22rem] border-b border-border text-right text-muted tabular-nums">
                            {formatInches(item.thicknessIn)} × {formatInches(item.widthIn)} ×{' '}
                            {formatInches(item.lengthIn)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {boardCount !== null ? (
                    <p className="mt-[0.6rem] mb-0 text-[0.85rem] text-fg">
                      Board-buying plan: buy <strong>{boardCount}</strong>{' '}
                      {boardCount === 1 ? 'board' : 'boards'} at{' '}
                      {DEFAULT_OPTIONS.stockLengthIn / 12} ft &mdash; kerf included.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── TRUST MARQUEE ────────────────────────────────────────────────── */}
      <div className="landing-marquee landing-marquee-on-surface border-y border-border bg-surface">
        <ul className="landing-marquee-track list-none m-0 py-[0.95rem] px-0 [--speed:32s] [--gap:2.75rem]">
          {[0, 1].map((set) =>
            TRUST_ITEMS.map((item, i) => (
              <li
                key={`${set}-${i}`}
                inert={set === 1}
                aria-hidden={set === 1 ? true : undefined}
                className="inline-flex items-center gap-[0.55rem] text-[0.95rem] text-muted-2 whitespace-nowrap"
              >
                {item.icon ? (
                  <span className="text-ok" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {item.strong ? <strong className="text-fg">{item.text}</strong> : item.text}
              </li>
            )),
          )}
        </ul>
      </div>

      {/* ── DIFFERENTIATORS ──────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <div className={`${wrap} py-[3.5rem]`}>
          <span className={eyebrow}>Why this catalog</span>
          <h2 className={sectionH2}>What sets it apart</h2>
          <p className="text-muted text-[1.02rem] max-w-[52ch] mb-[2rem]">
            Every claim here is something the app does today.
          </p>
          <ul className="list-none m-0 p-0 grid gap-[1.1rem] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="bg-surface border border-border rounded-[0.8rem] p-[1.4rem] shadow-e1 transition-[translate,box-shadow] duration-200 hover:-translate-y-[4px] hover:shadow-e3 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className={isq}>{f.icon}</span>
                <h3 className="font-display text-[1.1rem] font-semibold mt-[0.85rem] mb-[0.4rem]">
                  {f.title}
                </h3>
                <p className="m-0 text-muted text-[0.93rem]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── HOW IT WORKS (timeline) ──────────────────────────────────────── */}
      <section className={`${wrap} py-[3.5rem]`}>
        <span className={eyebrow}>How it works</span>
        <h2 className={sectionH2}>Find it, buy for it, build it</h2>
        <ol className="list-none m-0 p-0 mt-[1.5rem] grid gap-[1.25rem] lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="bg-surface border border-border border-b-border-strong rounded-[0.8rem] p-[1.4rem] shadow-e1"
            >
              <div className="flex items-center gap-[0.75rem] mb-[0.65rem]">
                <span className="inline-flex items-center justify-center w-[1.7rem] h-[1.7rem] rounded-[50%] bg-fg text-surface font-display font-semibold text-[0.9rem]">
                  {i + 1}
                </span>
                <span className={isq} style={{ width: '2.4rem', height: '2.4rem' }}>
                  {s.icon}
                </span>
              </div>
              <h3 className="font-display text-[1.1rem] font-semibold mt-[0.4rem] mb-[0.3rem]">
                {s.title}
              </h3>
              <p className="m-0 text-muted text-[0.93rem]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── FEATURED (real plans) + CATEGORIES, as revolving carousels ───── */}
      {featured.length > 0 ? (
        <section className="border-y border-border bg-surface">
          <div className={`${wrap} pt-[3.5rem] pb-[2rem]`}>
            <span className={eyebrow}>Featured plans</span>
            <h2 className={sectionH2}>Start with something buildable</h2>
            <p className="text-muted text-[1.02rem] max-w-[52ch] mb-0">
              Straight from the catalog&rsquo;s Trending order &mdash; real plans, each
              fully specified.
            </p>
          </div>

          <div className="landing-marquee landing-marquee-on-surface pb-[2rem]">
            <ul className="landing-marquee-track list-none m-0 p-0 px-[1.5rem] [--speed:60s]">
              {[0, 1].map((set) =>
                featured.map((plan) => (
                  // set 1 is the visual loop duplicate — inert + aria-hidden so it isn't a
                  // second tab stop and screen readers don't read the carousel twice.
                  <PlanCard
                    key={`f${set}-${plan.id}`}
                    plan={plan}
                    decorative={set === 1}
                  />
                )),
              )}
            </ul>
          </div>

          <div className={`${wrap} pb-[1rem]`}>
            <div className="text-[0.7rem] uppercase tracking-[0.07em] text-muted font-semibold mb-[0.7rem]">
              Or browse by category
            </div>
          </div>
          <div className="landing-marquee landing-marquee-on-surface pb-[3.5rem]">
            <ul className="landing-marquee-track list-none m-0 p-0 px-[1.5rem] [--speed:34s] [animation-direction:reverse]">
              {[0, 1].flatMap((set) => {
                // set 1 is the visual loop duplicate — kept out of the tab order + a11y tree.
                const dup = set === 1;
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
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] rounded-[1.1rem] border border-accent-tint-border overflow-hidden shadow-e3">
          <div className="relative min-h-[14rem] bg-[radial-gradient(130%_130%_at_25%_15%,#ffe6c4,var(--accent)_120%)] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7a4a12"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[7rem] h-[7rem] opacity-90 -rotate-[8deg] drop-shadow-[0_8px_14px_rgba(60,42,24,0.25)]"
              aria-hidden="true"
            >
              <path d="M2 20l4-1 9-9-3-3-9 9z" />
              <path d="M12 7l3 3" />
              <path d="M14 5l5-3 3 3-3 5-2-2" />
            </svg>
          </div>
          <div className="bg-surface p-[2.25rem]">
            <span className={eyebrow}>Who it&rsquo;s for</span>
            <h2 className="font-display text-[1.6rem] font-semibold mt-[0.5rem] mb-[0.7rem]">
              For the &ldquo;what can I build this weekend?&rdquo; woodworker.
            </h2>
            <p className="text-muted text-[1.02rem] mb-[1.1rem]">
              You&rsquo;ve got a Saturday, a pile of 2×4s, and a tape measure. You
              don&rsquo;t want a PDF with the cut list buried on page 7 &mdash; you want to
              know what to build and what to buy. That&rsquo;s the whole idea.
            </p>
            <ul className="list-none m-0 p-0">
              {AUDIENCE.map((a) => (
                <li key={a} className="flex items-center gap-[0.75rem] my-[0.7rem] text-[1rem]">
                  <span
                    className="inline-flex items-center justify-center w-[2.2rem] h-[2.2rem] rounded-[0.5rem] bg-accent-tint shrink-0"
                    aria-hidden="true"
                  >
                    ✓
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
          {FAQS.map((f, i) => (
            <details
              key={f.q}
              open={i === 0}
              className="border-b border-border py-[0.2rem]"
            >
              <summary className="cursor-pointer font-semibold py-[0.75rem] text-[1.02rem] list-none [&::-webkit-details-marker]:hidden">
                {f.q}
              </summary>
              <p className="m-0 mb-[0.85rem] text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className={`${wrap} py-[3.5rem]`}>
        <div className="relative overflow-hidden text-center rounded-[1.1rem] px-[1.5rem] py-[3.5rem] bg-[linear-gradient(160deg,#2a2320,#17140f)] text-[#f0ece4] shadow-e3 before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(50%_120%_at_50%_-20%,rgba(233,168,108,0.35),transparent_60%)]">
          <h2 className="relative font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold m-0 mb-[0.5rem]">
            Find your next project.
          </h2>
          <p className="relative text-[#c9c2b6] m-0 mb-[1.6rem]">
            Hundreds of plans, each fully specified. Free to browse &mdash; no account
            required.
          </p>
          <Link
            href={CATALOG_PATH}
            className="relative inline-flex items-center min-h-[2.9rem] px-[1.25rem] rounded-[0.5rem] font-semibold no-underline bg-accent text-[#1a1a1a] border border-accent shadow-e2"
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

const TRUST_ITEMS = [
  { text: 'Hundreds of plans', strong: true, icon: false },
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
