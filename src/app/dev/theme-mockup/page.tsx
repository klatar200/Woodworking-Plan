import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { CATALOG_PATH } from '@/lib/routes';
import './mockup.css';

/**
 * Luxury light-theme MOCKUP — design exploration only.
 *
 * Gates:
 * 1. `VERCEL_ENV === 'production'` → `notFound()` — never on the live site.
 *    Preview + local stay reachable so the palette can be reviewed in a browser.
 * 2. Allowlisted on `PUBLIC_ROUTES` (static mockup, no user data). Production
 *    still 404s via gate 1; this is not a content/catalog surface.
 *
 * Scoped under `.lux-mock` — does NOT mutate live `:root` Oak & Forest tokens.
 * Approve palette → separate light-theme re-palette sprint.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dev — luxury light theme mockup',
  robots: { index: false, follow: false },
};

const FEATURES = [
  {
    num: '01',
    title: 'Full cut lists',
    body: 'Every board, every dimension — tape fractions, not decimals. Compare before you buy.',
  },
  {
    num: '02',
    title: 'Board buying plan',
    body: 'Kerf-aware layout so six 16″ cuts do not pretend to fit an 8′ board.',
  },
  {
    num: '03',
    title: 'Tools you own',
    body: 'Filter the catalog by what is already on your wall — not a fantasy shop.',
  },
  {
    num: '04',
    title: 'Cost as a band',
    body: 'Tier marks only. No dollar bait, no affiliate upsell.',
  },
] as const;

const SWATCHES = [
  { name: 'Forest', hex: '#0A341F', color: '#0A341F' },
  { name: 'Olive', hex: '#2F4630', color: '#2F4630' },
  { name: 'Beige gold', hex: '#B28538', color: '#B28538' },
  { name: 'Rusty brown', hex: '#8B4F2E', color: '#8B4F2E' },
  { name: 'Creamy tan', hex: '#E4D9C4', color: '#E4D9C4' },
] as const;

export default function LuxuryThemeMockupPage() {
  // Live production only — preview/local must stay open for design review.
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <div className="lux-mock">
      <div className="lux-mock__banner" role="status">
        <span>
          <strong>MOCKUP</strong> — luxury light palette exploration. Live site tokens
          unchanged.
        </span>
        <Link href="/">← Back to live landing</Link>
      </div>

      {/* Hero: brand + one line + one lede + CTAs on full-bleed forest */}
      <section className="lux-mock__hero" aria-label="Luxury theme hero mockup">
        <div className="lux-mock__wash" aria-hidden="true" />
        <div className="lux-mock__grain" aria-hidden="true" />
        <div className="lux-mock__vignette" aria-hidden="true" />
        <div className="lux-mock__flecks" aria-hidden="true">
          <span className="lux-mock__fleck" />
          <span className="lux-mock__fleck" />
          <span className="lux-mock__fleck" />
          <span className="lux-mock__fleck" />
        </div>

        <div className="lux-mock__hero-inner">
          <span className="lux-mock__brand-mark" aria-hidden="true" />
          <p className="lux-mock__brand">{BRAND_NAME}</p>
          <h1 className="lux-mock__headline">Plans you can actually compare.</h1>
          <p className="lux-mock__lede">
            Structured cut lists, materials, and tools — the quiet confidence of a
            catalog built for the workbench, not the feed.
          </p>
          <div className="lux-mock__ctas">
            <Link href={CATALOG_PATH} className="lux-mock__btn lux-mock__btn--gold">
              Browse the plans
            </Link>
            <Link href="/sign-up" className="lux-mock__btn lux-mock__btn--ghost">
              Create a free account
            </Link>
          </div>
        </div>

        <div className="lux-mock__hero-plane" aria-hidden="true">
          <span className="lux-mock__hero-plane-mark">N</span>
        </div>
      </section>

      {/* Cream editorial — features as rules, not cards */}
      <section className="lux-mock__band">
        <div className="lux-mock__band-inner">
          <p className="lux-mock__eyebrow">Why this catalog</p>
          <h2 className="lux-mock__h2">Craft, specified.</h2>
          <p className="lux-mock__p">
            Same structured detail on every plan — so the expensive feel comes from
            clarity, not ornament.
          </p>
          <ul className="lux-mock__features">
            {FEATURES.map((f) => (
              <li key={f.num}>
                <span className="lux-mock__feat-num" aria-hidden="true">
                  {f.num}
                </span>
                <div>
                  <h3 className="lux-mock__feat-title">{f.title}</h3>
                  <p className="lux-mock__feat-body">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Forest band — palette reference for review */}
      <section className="lux-mock__band lux-mock__band--forest">
        <div className="lux-mock__grain" aria-hidden="true" />
        <div className="lux-mock__band-inner" style={{ position: 'relative', zIndex: 1 }}>
          <p className="lux-mock__eyebrow">Proposed light tokens</p>
          <h2 className="lux-mock__h2">Forest, gold, and cream.</h2>
          <p className="lux-mock__p">
            Tuned from your references: deeper forest than today&rsquo;s Oak &amp; Forest
            paper, metallic gold for accent, rust for quiet labels, cream for reading
            surfaces. Grain + vignette give the green weight.
          </p>
          <div className="lux-mock__swatches" role="list">
            {SWATCHES.map((s) => (
              <div key={s.hex} className="lux-mock__swatch" role="listitem">
                <div
                  className="lux-mock__swatch-chip"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <div className="lux-mock__swatch-meta">
                  <strong>{s.name}</strong>
                  {s.hex}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Close CTA on cream */}
      <section className="lux-mock__close">
        <div className="lux-mock__close-inner">
          <p className="lux-mock__eyebrow">Next</p>
          <h2 className="lux-mock__h2">{BRAND_TAGLINE}</h2>
          <p className="lux-mock__p">
            If this direction feels right, we promote these hues into live{' '}
            <code style={{ fontSize: '0.9em' }}>:root</code> tokens in a dedicated
            light-theme sprint — contrast guards and Clerk chrome included.
          </p>
          <div className="lux-mock__ctas">
            <Link href={CATALOG_PATH} className="lux-mock__btn lux-mock__btn--gold">
              Open the live catalog
            </Link>
            <Link href="/" className="lux-mock__btn lux-mock__btn--ghost">
              Compare to current home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
