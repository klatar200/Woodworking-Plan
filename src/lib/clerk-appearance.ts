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
 * Kept as ONE shared object (not copy-pasted into sign-in/page.tsx,
 * sign-up/page.tsx, and site-header.tsx separately) so the palette can only
 * drift out of sync with globals.css in one place, not three.
 *
 * NOTE: these are literal hex values, not `var(--...)` references — Clerk's
 * components render inside their own iframe/portal in some flows and don't
 * inherit this app's CSS custom properties, so the tokens from globals.css
 * are duplicated here deliberately. If the palette in globals.css ever
 * changes, this file needs the same update.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#1a1a1a',
    colorBackground: '#ffffff',
    colorText: '#1a1a1a',
    colorTextSecondary: '#8a8175',
    colorDanger: '#b5551c',
    colorInputBackground: '#faf9f6',
    colorInputText: '#1a1a1a',
    borderRadius: '0.5rem',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
} as const;
