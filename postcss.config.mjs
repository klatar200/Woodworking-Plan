/**
 * PostCSS config — Sprint 28 (Tailwind CSS environment setup).
 *
 * Tailwind v4 ships its entire pipeline as a single PostCSS plugin
 * (`@tailwindcss/postcss`); there is no `tailwind.config.js` — the theme is
 * configured CSS-first via `@theme` in `src/app/tailwind.css`. Next.js picks
 * this file up automatically for both the webpack and Turbopack pipelines.
 *
 * This is additive: `globals.css` (the existing hand-written system) is
 * untouched this sprint. Tailwind is installed alongside it. See BUILD_PLAN.md
 * §4.4 (Sprint 28) and DECISIONS_LOG.md 2026-07-16.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
