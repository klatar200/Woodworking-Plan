import Link from 'next/link';
import { NAV_CATEGORIES } from '@/lib/nav-categories';

/**
 * Site footer — QOL-D item 2.
 *
 * A plain server component: links only, no state, no data fetching. The categories come
 * from the same build-time constant the Browse menu uses (`src/lib/nav-categories.ts`),
 * so the footer costs the root layout nothing — no query, no I/O, and no way for a
 * database problem to take down the page shell.
 *
 * `site-footer` CLASS RETAINED and hidden by the print stylesheet, alongside
 * `.site-header`. A nav bar on a printed cut sheet is a wasted half-page, and that
 * applies to a footer full of category links just as much. This is the standing rule:
 * any class named in an `@media print` block stays on its element.
 *
 * NOTE ON COPY: the product name is still the "Woodworking Plan" placeholder from
 * BUSINESS_PLAN.md §1 — branding decision #8 is open, and inventing a brand is not the
 * build agent's call (BUILD_PLAN.md §2). No new marketing copy is introduced here; the
 * footer only labels and links things that already exist.
 */
/**
 * The group headings are real `<h2>`s (structure), but the global `h2` rule in
 * `globals.css` is UNLAYERED and therefore beats any layered Tailwind utility — the
 * same cascade trap that made Sprint 30a defer `.catalog-nav-heading` to the typography
 * pass. Without `!`, these would silently render at the global 1rem with a 2rem top
 * margin, dropping a gap into the top of each footer column. Uppercase and the muted
 * colour are inherited from that same global rule and deliberately not repeated.
 */
const heading = 'text-[0.75rem]! tracking-[0.06em]! mt-0! mb-[0.5rem]!';
const footerLink =
  'inline-flex items-center min-h-[2.25rem] text-[0.9375rem] text-muted no-underline hover:text-fg focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2';

const SITE_LINKS = [
  { href: '/', label: 'All plans' },
  // QOL-E: display name only — the URL stays /paths. See site-header.tsx.
  { href: '/paths', label: 'Learning' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer mt-[4rem] border-t border-border bg-surface px-[1.25rem] pt-[2rem] pb-[calc(2rem+env(safe-area-inset-bottom))] lg:px-[2.5rem]">
      <div className="max-w-[64rem] mx-auto flex flex-wrap gap-[2.5rem]">
        <nav aria-label="Browse by category" className="min-w-[12rem]">
          <h2 className={heading}>Browse</h2>
          <ul className="list-none m-0 p-0 flex flex-col">
            {NAV_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link href={`/?category=${category.slug}`} className={footerLink}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Site" className="min-w-[10rem]">
          <h2 className={heading}>Site</h2>
          <ul className="list-none m-0 p-0 flex flex-col">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="max-w-[64rem] mx-auto mt-[2rem] mb-0 text-[0.8125rem] text-muted">
        &copy; {new Date().getFullYear()} Woodworking Plan. Measure your own material and
        follow the safety guidance for your tools &mdash; a plan is a well-specified
        starting point, not a substitute for judgement at the saw.
      </p>
    </footer>
  );
}
