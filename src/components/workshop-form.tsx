import { btnPrimary, checkbox, checkboxInput } from '@/lib/ui';
import { listFilterableTools } from '@/lib/plans';
import { getOwnedToolSlugs } from '@/lib/workshop';
import { saveWorkshopAction } from '@/app/actions/workshop';

const legendClass =
  'p-0 text-[0.75rem] uppercase tracking-[0.06em] text-muted mb-[0.5rem]';

/**
 * The owned-tools picker — Sprint 25's form, moved out of `/workshop` and into the
 * profile page as a settings section (QOL-D item 3, `DECISIONS_LOG.md` 2026-07-19).
 *
 * Extracted to its own component so `/profile` stays the thin account view it was
 * written to be: the page composes sections, the section owns its own reads.
 *
 * SECURITY IS UNCHANGED, and all of it lives below this component anyway. No `userId`
 * appears in this file or in anything it calls: `getOwnedToolSlugs()` and
 * `setOwnedTools()` derive the owner from the verified Clerk session, and
 * `saveWorkshopAction` re-checks that server-side — a form is not authorization.
 * `/profile` is off the `PUBLIC_ROUTES` allowlist and calls `requireUser()`, so this
 * renders only for a signed-in owner, same as `/workshop` did.
 *
 * Still a plain <form> posting to a server action: no client JS. Save is REPLACE-ALL —
 * the form submits the complete checked set, so un-ticking a tool removes it.
 *
 * The tool list is the SAME set the catalog's filter panel offers (tools some published
 * plan actually requires), grouped the same way — a tool no plan uses would be an inert
 * checkbox.
 */
export async function WorkshopForm() {
  const [tools, owned] = await Promise.all([
    listFilterableTools(),
    getOwnedToolSlugs(),
  ]);

  const ownedSet = new Set(owned);

  const grouped = new Map<string, typeof tools>();
  for (const tool of tools) {
    const key = tool.category ?? 'Other';
    const list = grouped.get(key) ?? [];
    list.push(tool);
    grouped.set(key, list);
  }

  return (
    <form action={saveWorkshopAction} className="grid gap-[1.25rem]">
      {/* Attacker-controlled once submitted, so it goes through safeReturnTo on the
          server. It only decides where a RATE-LIMIT DENIAL bounces back to. */}
      <input type="hidden" name="returnTo" value="/profile" />

      <fieldset className="border-none p-0 m-0 min-w-0">
        <legend className={legendClass}>Tools you own</legend>
        <p className="mt-[-0.25rem] mx-0 mb-[0.625rem] text-[0.875rem] text-muted">
          Tick everything you have. Saving replaces your current list, so un-ticking a
          tool removes it.
        </p>

        {[...grouped.entries()].map(([group, groupTools]) => (
          <div key={group} className="mb-[0.75rem]">
            <span className="block text-[0.8125rem] text-muted mb-[0.375rem]">{group}</span>
            <div className="flex flex-wrap gap-[0.375rem]">
              {groupTools.map((tool) => (
                <label key={tool.slug} className={checkbox}>
                  <input
                    type="checkbox"
                    name="tools"
                    value={tool.slug}
                    defaultChecked={ownedSet.has(tool.slug)}
                    className={checkboxInput}
                  />
                  <span>{tool.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex gap-[0.5rem] flex-wrap">
        <button type="submit" className={btnPrimary}>
          Save my workshop
        </button>
      </div>

      <p className="footnote mt-0">
        Private to your account. This is a convenience for filtering &mdash; it never
        changes what anyone else sees, and the catalog still shows every plan until you
        apply the filter.
      </p>
    </form>
  );
}
