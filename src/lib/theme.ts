/**
 * Theme constants — the pure, server-safe half of the theme system (Sprint 37, audit D1).
 *
 * The engine itself is unchanged from Sprint 31: a `theme` cookie is read server-side in
 * the root layout and stamped as `.dark` on `<html>` before paint, and every colour token
 * flips in `globals.css`. This module holds the values BOTH sides need — the server layout
 * (cookie name, browser-chrome colours, the init script) and the client store (cookie
 * write) — so they cannot drift. It deliberately imports nothing and touches no DOM, which
 * is what lets `layout.tsx` use it.
 */

export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'theme';

/** One year. Long enough that a preference set once is not re-asked every season. */
export const THEME_COOKIE_MAX_AGE = 31536000;

/**
 * The cookie the toggle writes. `SameSite=Lax` (not None) and no `Secure` flag so it works
 * on `localhost` too; it holds a display preference, nothing authenticating.
 */
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * `<meta name="theme-color">` per theme — the OS browser chrome (Android toolbar, iOS
 * status bar area, PWA title bar). These are each theme's `--bg`, so the chrome continues
 * the page rather than framing it. Before Sprint 37 this was a fixed `#1a1a1a`, i.e. a dark
 * toolbar over a cream page in the DEFAULT theme (audit D1).
 */
export const THEME_CHROME_COLOR: Record<Theme, string> = {
  light: '#f6f1e7', // Sprint 44: the Oak & Forest --bg. tests/theme.test.tsx byte-compares this against globals.css.
  dark: '#17140f',
};

/**
 * 🛑 THE ONLY INLINE SCRIPT IN THE APP. Read the reasoning before touching it.
 *
 * DECISION 2026-07-21 (Keagan, `DECISIONS_LOG.md`): with **no cookie**, the app follows the
 * OS `prefers-color-scheme`. This REVERSES the 2026-07-16 "cookie, not OS" call, at his
 * direction — the audit's case (D1) is a phone in a dim workshop rendering bright cream.
 *
 * Why a script at all: the server cannot see `prefers-color-scheme` — it is not a request
 * header — so the class can only be decided in the browser. Doing that in a `useEffect`
 * would flip the theme AFTER first paint, which is precisely the flash the server-side
 * cookie stamp exists to prevent. A parser-blocking inline script runs before the body
 * renders, so there is no flash.
 *
 * Why it is safe: it reads one cookie's PRESENCE (never its value, never any other
 * cookie), sets one class, writes nothing, and is wrapped in try/catch so an ancient
 * browser without `matchMedia` degrades to the light default instead of dying before the
 * page renders. It carries the CSP nonce from the `x-nonce` request header — our
 * `script-src` is `'strict-dynamic'` + nonce, so an un-nonced inline script would simply
 * be blocked (silently, which is how the Clerk CSP bug shipped twice).
 *
 * ⚠️ `\\s` IS DELIBERATE. This is a JS string, so `\s` would be an unrecognised escape and
 * collapse to a bare `s` — shipping the regex `/(?:^|;s*)theme=/`, which fails to match any
 * cookie that is not first in the list. The double backslash emits a real `\s` to the
 * browser. There is a test asserting exactly this.
 *
 * The cookie test is anchored on `^` or `;` so a cookie merely ENDING in "theme" (say
 * `mytheme=x`) does not count as an explicit choice.
 */
export const THEME_INIT_SCRIPT =
  "try{if(!/(?:^|;\\s*)theme=/.test(document.cookie)&&" +
  "matchMedia('(prefers-color-scheme: dark)').matches)" +
  "document.documentElement.classList.add('dark')}catch(e){}";
