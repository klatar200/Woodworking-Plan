import { redirect } from 'next/navigation';

/**
 * `/workshop` → `/profile#workshop` — QOL-D item 3 (`DECISIONS_LOG.md` 2026-07-19).
 *
 * The owned-tools picker moved into the profile page as a settings section and lost its
 * header slot (Keagan's call: you set your tools once). This route is KEPT rather than
 * deleted, because deleting it would break every bookmark, every link someone has
 * already followed, and — until they are all found — the plan page's "Update your
 * workshop" prompt. A dead link on a signed-in-only page is a real regression, and the
 * cost of not having one is four lines.
 *
 * STILL PRIVATE. This path is not on the `PUBLIC_ROUTES` allowlist, so the middleware
 * requires a session before this file runs at all — and the target, `/profile`, is
 * private too and calls `requireUser()`. The redirect therefore cannot be used to probe
 * anything: an anonymous request never gets here.
 *
 * `redirect()` is a framework-handled control-flow signal (a 307), not the uncaught
 * throw that the rate-limit incident was about.
 */
export default function WorkshopPage(): never {
  redirect('/profile#workshop');
}
