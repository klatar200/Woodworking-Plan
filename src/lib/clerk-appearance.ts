/**
 * Shared Clerk theming — the visual reskin for sign-in/sign-up/account UI.
 *
 * Per DECISIONS_LOG.md ("UI redesign: adopt Claude Design mockup's visual
 * system"): Clerk's hosted components stay in charge of every auth/account
 * flow (password reset, email verification, account deletion, bot
 * protection) — none of that is rebuilt by hand. This file only supplies
 * colors/typography/radius so Clerk's UI matches the rest of the app, via
 * Clerk's own `appearance` API.
 *
 * ONE PLACE, ONE SOURCE. Both objects are passed to `<ClerkProvider>` in the root layout
 * (`appearance={isDark ? clerkAppearanceDark : clerkAppearance}`), and every Clerk surface
 * — the sign-in and sign-up pages, and `clerk.openUserProfile()` — inherits from the
 * provider. Do NOT re-pass `appearance` at a call site: that is how a page ends up light
 * inside a dark app, which is the bug Sprint 37 fixed.
 *
 * NOTE: these are literal hex values, not `var(--...)` references — Clerk's
 * components render inside their own iframe/portal in some flows and don't
 * inherit this app's CSS custom properties, so the tokens from globals.css
 * are duplicated here deliberately.
 *
 * 🛑 THE DRIFT HOLE IS NOW A RED TEST. This file's old comment said it "needs the same
 * update" when globals.css changes — and it silently did not get one: `colorTextSecondary`
 * was still `#8a8175`, the PRE-Sprint-33 `--muted-2`, i.e. the exact sub-AA value that
 * sprint darkened for failing contrast. A comment asking to be remembered is not a
 * mechanism. `tests/clerk-appearance.test.ts` now parses `:root` / `.dark` out of
 * globals.css and asserts every value below equals its token, so the next palette edit
 * fails a named test instead of leaving Clerk behind.
 */

/** Light theme — mirrors `:root` in globals.css (Sprint 44: Oak & Forest values). */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#1e2420', // --fg
    colorBackground: '#fffdf8', // --surface
    colorText: '#1e2420', // --fg
    colorTextSecondary: '#6f6a59', // --muted-2 (re-derived twice: Sprint 33 for AA, Sprint 44 for the new paper)
    colorDanger: '#ac511b', // --danger (Sprint 44 re-derivation — old value fell under AA on the new --bg)
    colorInputBackground: '#f6f1e7', // --bg
    colorInputText: '#1e2420', // --fg
    borderRadius: '0.5rem',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
} as const;

/**
 * Dark theme — mirrors `.dark` in globals.css (Sprint 37.2, audit D1).
 *
 * Without this, the single most jarring moment in the app was signing in from dark mode:
 * Clerk's pages and its account modal rendered pure white inside an otherwise dark page.
 *
 * `colorPrimary` is the light INK (`--fg`), not the orange accent — in Clerk's system
 * `colorPrimary` fills the primary button, and our accent orange with Clerk's automatic
 * white button text would be a contrast failure. Ink-filled buttons with dark text is what
 * the light theme already does, mirrored.
 *
 * KNOWN LIMIT, deliberately not chased: toggling the theme while a Clerk modal is already
 * open does not re-theme that open modal — the provider prop is read at render. It is
 * correct on the next render, and nobody toggles themes mid-sign-in.
 */
export const clerkAppearanceDark = {
  variables: {
    colorPrimary: '#e9efe9', // --fg (dark)
    colorBackground: '#0f241a', // --surface (dark)
    colorText: '#e9efe9', // --fg (dark)
    colorTextSecondary: '#7f8f83', // --muted-2 (dark)
    colorDanger: '#e58a5c', // --danger (dark)
    colorInputBackground: '#08160f', // --bg (dark)
    colorInputText: '#e9efe9', // --fg (dark)
    borderRadius: '0.5rem',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
} as const;
