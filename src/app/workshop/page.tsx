import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { listFilterableTools } from '@/lib/plans';
import { getOwnedToolSlugs } from '@/lib/workshop';
import { saveWorkshopAction } from '@/app/actions/workshop';
import { RateLimitNotice } from '@/components/rate-limit-notice';
import { hasRateLimitNotice } from '@/lib/rate-limit-feedback';

/**
 * My Workshop — Sprint 25. The owned-tools profile.
 *
 * PRIVATE by default: not on the `PUBLIC_ROUTES` allowlist, so the middleware requires a
 * session, and `requireUser()` here is the second, independent check (defence in depth,
 * same as /profile). No `userId` anywhere — the owner is the session.
 *
 * A plain GET-free <form> posting to a server action, no client JS. Save writes the whole
 * checked set (replace-all). This screen only RECORDS what you own; it does not filter the
 * catalog — it pre-fills the catalog's "tools you own" filter, which stays URL-driven so a
 * shared link renders the same catalog for everyone.
 *
 * The tool list is the SAME set the filter panel offers (tools some published plan
 * requires), grouped the same way — a tool no plan uses would be an inert checkbox.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Workshop',
  robots: { index: false, follow: false }, // private, and branding #8 still open.
};

type SearchParams = Promise<{ saved?: string; notice?: string }>;

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();
  const params = await searchParams;

  const [tools, owned] = await Promise.all([
    listFilterableTools(),
    getOwnedToolSlugs(),
  ]);

  const ownedSet = new Set(owned);

  // Group by category, exactly like the filter panel.
  const grouped = new Map<string, typeof tools>();
  for (const tool of tools) {
    const key = tool.category ?? 'Other';
    const list = grouped.get(key) ?? [];
    list.push(tool);
    grouped.set(key, list);
  }

  return (
    <main id="main" className="page">
      <p className="breadcrumb no-print">
        <Link href="/">← All plans</Link>
      </p>

      <h1>My Workshop</h1>
      <p className="subtitle">
        Tell us which tools you own. We&rsquo;ll pre-tick the &ldquo;tools you own&rdquo;
        filter on the catalog so you can see what you can build in one click.
      </p>

      <RateLimitNotice
        show={hasRateLimitNotice(params.notice)}
        dismissHref="/workshop"
      />

      {params.saved === '1' ? (
        <p className="notice" role="status">
          Workshop saved. Your tools are ready on the{' '}
          <Link href="/">catalog filter</Link>.
        </p>
      ) : null}

      <form action={saveWorkshopAction} className="filters-form">
        <input type="hidden" name="returnTo" value="/workshop" />

        <fieldset className="filter-group">
          <legend>Tools you own</legend>
          <p className="filter-hint">
            Tick everything you have. Saving replaces your current list, so un-ticking a
            tool removes it.
          </p>

          {[...grouped.entries()].map(([group, groupTools]) => (
            <div key={group} className="tool-group">
              <span className="tool-group-name">{group}</span>
              <div className="checkbox-row">
                {groupTools.map((tool) => (
                  <label key={tool.slug} className="checkbox">
                    <input
                      type="checkbox"
                      name="tools"
                      value={tool.slug}
                      defaultChecked={ownedSet.has(tool.slug)}
                    />
                    <span>{tool.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <div className="filters-actions">
          <button type="submit" className="btn btn-primary">
            Save my workshop
          </button>
          <Link href="/" className="btn btn-ghost">
            Back to plans
          </Link>
        </div>
      </form>

      <p className="footnote">
        Private to your account. This is a convenience for filtering — it never changes what
        anyone else sees, and the catalog still shows every plan until you apply the filter.
      </p>
    </main>
  );
}
