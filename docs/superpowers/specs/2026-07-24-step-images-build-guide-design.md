# Step images on the build guide

**Date:** 2026-07-24  
**Status:** approved 2026-07-24 — implementing  
**Approach:** 1 — nullable `imageUrl` on `Step`  
**Surfaces:** `/plans/[slug]/build`, plan-page `PlanSteps` fallback, print (same media)

## Problem

Kreg plan JSON already carries optional `steps[].image` (URL ⊂ plan `images[]`). Schema + `load.ts` validate it. Seed drops it; Prisma `Step` has no image field; `PlanSteps` never renders one. Build guide shows text-only steps despite ~11.7k step images in content (~91% of steps; 637/639 published plans have ≥1).

## Locked UI

| Viewport | Placement | Size gate |
|---|---|---|
| Desktop (≥1024px) | Title + chips full width; then **body left · image right** | `max-width: 320px` + `max-height: 240px` |
| Mobile | Title → chips → **body** → **image** | full content width + `max-height: 200px` |

- `object-fit: cover` so portrait/landscape sources share one footprint across plans.
- CSS tokens on `:root` (e.g. `--step-img-max-w` / `--step-img-max-h` with a mobile override) — no per-plan or per-image sizing.
- No image when `imageUrl` is null (untagged steps stay text-only).
- Mockup annotation badges (“New · step image”) are **not** shipping UI.
- Reference mockups: `docs/mockups/desktop.html`, `docs/mockups/mobile.html`.

## Data model

### Content (unchanged)

`plan-schema.ts` already allows optional `image: z.string().url()`. `load.ts` already enforces subset of `plan.images[].url`. No content rewrite.

### Prisma

Add to `Step`:

```prisma
/// Optional build-guide photo. URL must be one of the plan's Image.url values
/// (enforced at content load; seed copies through). Null = no step image.
imageUrl String?
```

No FK. Same denormalization as the JSON (`steps[].image` repeats a gallery URL). Alt is **not** stored on Step — resolve at render time by matching `imageUrl` against `plan.images` (fallback: step title).

### Seed

In the per-step `tx.step.create` data block, set `imageUrl: s.image ?? null`. Images `createMany` order unchanged. After deploy: `npm run db:migrate` then `npm run db:seed` against prod (content→DB does not ship with code).

### Query

`getPlanBySlug` already loads `steps` + `images`. No include change required — `imageUrl` is a scalar on `Step`. `PlanSteps` receives steps that now include `imageUrl`; parent pages already have `plan.images` for alt lookup **or** `PlanSteps` accepts an optional `images` map / resolves alt internally if we pass `images` in.

**Preferred:** extend `PlanSteps` props with `images: { url: string; alt: string }[]` (or a `Map`) so the component stays dumb and does not need the full plan. Call sites: build page, plan page, and print (print currently inlines steps — either route print through a shared helper or add image under body in print markup with print CSS that keeps `break-inside: avoid` on `.step`).

## Rendering

### `PlanSteps` (plan detail + `/build`)

Per step:

1. title  
2. chips (unchanged)  
3. `.step-main` wrapper:
   - desktop: CSS grid `1fr auto` → body | figure  
   - mobile: single column → body then figure  
4. `<figure class="step-image">` only if `imageUrl`:
   - `next/image` with existing R2 `remotePatterns`
   - `alt` from matching plan image, else step title  
   - sizes appropriate to the capped box  

Print stylesheet: keep image inside `.step` (already `break-inside: avoid`); force light; do not invent a server PDF.

### Accessibility / progressive enhancement

- Server-rendered `<img>` / `next/image` — no JS required for visibility.
- Walker still only toggles step `display`; images are part of each step’s DOM.
- Offline: saving a plan already caches `/build`; images are separate network fetches — existing SW policy for R2 hosts must allow them (confirm `img-src` + cache behavior; do not invent a new private cache path).

## Out of scope

- Multiple images per step (content has 0).
- Re-authoring missing step images (9 plans / ~9% of steps).
- Changing plan hero/gallery.
- Dark-theme re-palette.
- Monetization / gating of build media.

## Tests / guards

- Schema/load: existing subset check stays; add seed/unit coverage that `imageUrl` round-trips when present and stays null when absent.
- Component/source test: `PlanSteps` renders `<img>` (or `next/image`) when `imageUrl` set; omits when null; desktop/mobile class or CSS tokens exist with the locked max dimensions (source assertion on tokens, similar to other design guards).
- Do not assert pixel-perfect layout in Vitest — tokens + markup structure only.
- Manual: `/plans/x-leg-tv-stand/build` after local migrate+seed.

## Rollout

1. Migration + code ship to `main` / Vercel.  
2. Prod seed (required — otherwise UI ships and every `imageUrl` is null).  
3. Spot-check a few published plans on desktop + phone width.

## Success criteria

- Build guide and plan-page step list show the step photo when content provides one.  
- Same visual footprint across plans (CSS caps).  
- Placement matches locked table.  
- Unpublished / imageless steps unchanged.  
- No new client identity surfaces; `published:true` filter unchanged.
