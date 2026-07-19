# design-sync notes — Woodworking Plan

## What this syncs (READ FIRST)

This repo is a **Next.js app, not a component-library package.** Its real
components (`src/components/*`) are coupled to Clerk, Prisma, `next/link`, and
server actions — they can't render standalone in claude.ai/design. So we sync a
**purpose-built visual-system package** that carries only the portable design
layer (Keagan's decision, 2026-07-19, "sync visual system only").

- **The synced source is `.design-sync/ds-source/`** — a self-contained
  `@woodworking-plan/ui` package: 7 presentational React primitives that mirror
  the class strings in the app's `src/lib/ui.ts`, plus the token/theme system
  from `src/app/globals.css` + `tailwind.css`. **No Clerk/Prisma/Next imports.**
- Components: Button, Chip, CheckboxPill, TextInput, Select, CategoryLabel,
  PageContainer.

## Build pipeline (all runs in the sandbox — no Next build involved)

1. `npm run build --prefix .design-sync/ds-source` → `dist/index.js` (tsup ESM;
   NOT `.mjs` — `type:module`), `dist/index.d.ts`, `dist/styles.css`
   (`@tailwindcss/cli` over `tailwind-entry.css`).
2. Converter: `node .ds-sync/package-build.mjs --config .design-sync/config.json
   --node-modules ./.design-sync/ds-source/node_modules
   --entry ./.design-sync/ds-source/dist/index.js --out ./ds-bundle`
3. `node .ds-sync/package-validate.mjs ./ds-bundle`

## Gotchas

- **Keep the token utility safelist.** `tailwind-entry.css` has an
  `@source inline(...)` that force-compiles `{bg,text,border,outline}-<token>`
  for all 17 tokens. Without it `styles.css` would contain only the utilities the
  7 components use, and any token utility an agent-authored design references
  (`bg-surface`, `text-muted`, …) wouldn't resolve. The conventions header
  documents those utilities, so they MUST stay in the shipped closure.
- **No Tailwind preflight** (matches the app). Base reset (box-sizing, body font)
  is hand-written in `tailwind-entry.css`.
- **Dark mode = `class="dark"` on an ancestor** (token flip). No provider.
- Playwright pin: chromium build **1228** is cached at the default location; the
  latest `playwright` (installed into `.ds-sync/`) pins 1228 — they match. If the
  cache build changes, install the playwright version whose `browsers.json` pins
  the cached build.
- The tailwindcss CLI prints its banner to stderr; PowerShell surfaces it as a
  `NativeCommandError` — harmless, the build still succeeds (`Done in …`).

## Known render warns

None — render check is 7/7 clean.

## Re-sync risks

- **The DS is a hand-authored mirror of the app, not generated from it.** If
  `src/lib/ui.ts` class strings or the `globals.css`/`tailwind.css` tokens change
  in the app, `.design-sync/ds-source/` does NOT update automatically — re-mirror
  the changed strings/tokens by hand, then rebuild. (Consider this the standing
  drift risk.)
- Previews are authored (`.design-sync/previews/*.tsx`) and grade `good`; they
  carry forward at zero cost while their `.tsx` is unchanged.
- Everything is verified against Tailwind v4.3.3 / react 19.2.7 as pinned in
  `.design-sync/ds-source/package.json`.
