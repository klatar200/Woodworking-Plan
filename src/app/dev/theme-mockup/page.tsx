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
 *
 * v2 direction: tan paper as the page ground; textured fabric green as accent
 * only — soft contrast, not forest-vs-cream blocks.
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
  { name: 'Tan paper', hex: '#EFE6D4', color: '#EFE6D4', fabric: false },
  { name: 'Tan deep', hex: '#E2D5BE', color: '#E2D5BE', fabric: false },
  { name: 'Fabric green', hex: '#1A3D2A', color: '#1A3D2A', fabric: true },
  { name: 'Soft gold', hex: '#A88845', color: '#A88845', fabric: false },
  { name: 'Rust label', hex: '#8A5E3C', color: '#8A5E3C', fabric: false },
] as const;

export default function LuxuryThemeMockupPage() {
  // Live production only — preview/local must stay open for design review.
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <div className="lux-mock">
      <div className="lux-mock__banner" role="status">
        <span>
          <strong>MOCKUP v2</strong> — tan paper + fabric green. Soft contrast. Live
          tokens unchanged.
        </span>
        <Link href="/">← Back to live landing</Link>
      </div>

      {/* Hero: tan ground, fabric plane as the green accent */}
      <section className="lux-mock__hero" aria-label="Luxury theme hero mockup">
        <div className="lux-mock__paper-grain" aria-hidden="true" />
        <div className="lux-mock__wash" aria-hidden="true" />

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

        <div className="lux-mock__hero-plane lux-mock__fabric" aria-hidden="true">
          <span className="lux-mock__hero-plane-rim" />
          <span className="lux-mock__hero-plane-mark">N</span>
        </div>
      </section>

      <section className="lux-mock__band">
        <div className="lux-mock__paper-grain" aria-hidden="true" />
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

      {/* Fabric as a material sample on tan — not a full reverse band */}
      <section className="lux-mock__band">
        <div className="lux-mock__band-inner">
          <div className="lux-mock__fabric-inset">
            <div className="lux-mock__fabric lux-mock__fabric-sample">
              <span className="lux-mock__fabric-sample-label">Fabric green</span>
            </div>
            <div>
              <p className="lux-mock__eyebrow">Proposed light tokens</p>
              <h2 className="lux-mock__h2">Tan paper. Fabric green.</h2>
              <p className="lux-mock__p">
                Page ground is a luminous tan cream. Dark green shows up as a textured
                fabric accent — panels and marks — not as a competing full-page field.
              </p>
              <div className="lux-mock__swatches" role="list">
                {SWATCHES.map((s) => (
                  <div key={s.hex} className="lux-mock__swatch" role="listitem">
                    <div
                      className={
                        s.fabric
                          ? 'lux-mock__swatch-chip lux-mock__swatch-chip--fabric'
                          : 'lux-mock__swatch-chip'
                      }
                      style={{ backgroundColor: s.color }}
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
          </div>
        </div>
      </section>

      <section className="lux-mock__close">
        <div className="lux-mock__paper-grain" aria-hidden="true" />
        <div className="lux-mock__close-inner">
          <p className="lux-mock__eyebrow">Next</p>
          <h2 className="lux-mock__h2">{BRAND_TAGLINE}</h2>
          <p className="lux-mock__p">
            If this softer direction feels right, we promote these hues into live{' '}
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
