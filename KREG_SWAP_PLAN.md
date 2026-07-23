# Kreg Catalog Swap — apply scoping (2026-07-23)

Replace the entire ana-white catalog (`content/plans/*.json`) with the Kreg catalog derived
from `kreg-plans.json`. **Full swap.** Scoping only — nothing here has been executed.

Legend: 🟢 sandbox-safe (read-only tooling done) · 🟠 native (Keagan / Claude Code — needs
Postgres/network/git) · 🔴 gate/decision.

---

## Pre-flight gates — clear before ANY prod change

- 🔴 **G1 — Legal / provenance.** These are Kreg Tool's authored plans + photos. Republishing
  the text and re-hosting the images on Notch is a copyright/licensing call. Get comfortable
  (permission, licence, or a provenance/attribution model) before Phase 7. **This is the one
  hard blocker.**
- 🔴 **G2 — Image hosting.** Kreg URLs are on `learn.kregtool.com`; the app's CSP (`img-src`)
  and `next.config` `remotePatterns` allow only the R2 host. Decide: **re-host to R2**
  (recommended — matches the pipeline, survives Kreg rotating/deleting, and is the honest
  answer to G1) vs. allowlist kregtool.com (hotlinking — fragile, worse for G1). Everything
  below assumes re-host.
- 🔴 **G3 — Heuristic fields.** Time and cost are assumptions (no Kreg source). Accept as
  placeholders (UI shows only tiers) or supply real values. Non-blocking.

---

## Phase 1 — Generate the catalog 🟢→🟠 (tooling ready)

```
node scripts/import-kreg-plans.mjs           # → content/plans-import/ (1,128 files)
node scripts/validate-plans.mjs content/plans-import   # already dry-run clean
```

1,128 / 1,134 convert (6 empty entries dropped). 639 carry a full structured cut list; the
other 489 render everything but the cut list (optimizer/diagrams inactive for them).

## Phase 2 — Re-host images to R2 🟠 (the long pole — NO new script needed)

**The existing `scripts/migrate-images-to-r2.mjs` already does this.** It re-hosts any image
URL not already on the R2 host (kregtool.com included): fetch → sniff magic bytes → sharp
re-encode (strips EXIF/GPS) → upload keyed by `sha256(sourceUrl)` → rewrite the JSON by exact
string replace. Because the transform unions every step photo into the plan's `images[]` (the
strict validator proves `step.image ∈ images[]`), that full-text rewrite catches `steps[].image`
too. Idempotent and resumable. One 2-line enhancement added: an optional dir arg so it can run
on `content/plans-import` **before** the swap, so kregtool URLs never touch the live dir.

**Scale (measured): 16,098 distinct images** — 1,128 heroes + 11,669 step photos (~14/plan).
This is the largest task by far: ~16k download + re-encode + R2 put. At the script's default
concurrency (6) expect **~1–3 hours** and a few GB of R2 storage; bump `CONCURRENCY` for the run.

```
# native, .env.local has R2_* creds. --webp stores WebP at rest (see below).
node scripts/migrate-images-to-r2.mjs content/plans-import --webp --dry-run   # preview the 16,098
node scripts/migrate-images-to-r2.mjs content/plans-import --webp             # do it (resumable)
```

`--webp` (added): stores every image as WebP — photos lossy q80, PNG/GIF diagrams LOSSLESS so
text/lines don't smear. next/image already serves WebP to browsers, so this is an at-rest win:
~25–35% smaller than JPEG (40–70% vs PNG) → less R2 storage, smaller origin fetches for the
optimizer, faster uploads. Note: switching the flag on/off changes object keys (`.webp` vs
`.jpg`), so pick one for the import and stay consistent.

Caveats: some kregtool URLs may 404 → the script fails loudly and exits non-zero; re-run picks
up only the failures. Low-res `og_image` thumbnails are already excluded by the transform. ~20
plans have a "before"/raw hero as their primary (Kreg's `image` field) — a hero-quality
spot-check, separate from re-hosting.

**Scope decision:** re-host all 16,098, or heroes-only (1,128) first + step photos later? All is
the complete experience; heroes-only is ~7× cheaper/faster and still gives every card a photo.

## Phase 3 — Swap content on a branch 🟠

- Branch off `main` (the branch + git history is the backup).
- `git rm content/plans/*.json` → the ana-white catalog.
- Move `content/plans-import/*` → `content/plans/`.
- 🛑 **Delete the 5 learning paths** (`content/paths/*.json`). Confirmed: `load.ts` **throws**
  on a path referencing a plan that no longer exists — leaving them breaks validate/seed/build.
  Re-curate from Kreg plans later as a separate task if wanted.
- `apply-step-tags.mjs` (original-24 ana-white tags) is now dead — harmless, remove when tidy.

## Phase 4 — Prune the DB 🛑🟠 (the seed will NOT do this for you)

The seed **upserts on slug and never deletes plans absent from content.** Reseeding the swap
on top of prod leaves ~1,991 plans (863 old + 1,128 new). Two clean options:

- **(recommended) Reset the plan tables, then seed.** Since the site isn't launched, wipe
  `Plan` (children — steps/materials/cutList/images/tools — and user rows like reviews/likes/
  saves cascade off `planId`; there are no real users yet). Cleanest, guarantees exactly the
  1,128. *Verify the cascade in `prisma/schema.prisma` before running.*
- **Prune script.** Delete plans whose slug ∉ the new content set, then seed. Keeps any data
  you want to preserve, more moving parts.

Pick one and build the ~15-line script/step; it runs with the seed in Phase 7.

## Phase 5 — Gate 🟠

`validate-plans.mjs` clean → `tsc` → `eslint` → `vitest` → `next build`.
⚠️ **Expect test breakage.** ~10 test files couple to specific plan slugs or catalog counts
(e.g. the landing "N plans" count, cut-optimizer/offline fixtures). Update the counts and swap
fixture slugs to real Kreg ones — a real, bounded work item surfaced by the failing gate.

## Phase 6 — Commit + push → CI green 🟠

Trunk-based; push the branch, confirm Actions green (the run1/main lesson: read CI, don't assume).

## Phase 7 — Seed production 🛑🟠 (the one deliberate manual act)

Point `.env.local` at the **prod** Neon branch, then: `prisma migrate deploy` (likely no new
migration — this is content, not schema) → **run the reset/prune** → `tsx prisma/seed.ts`
(read the printed host — confirm it's prod) → swap `.env.local` back to dev. Smoke-test `/`,
a plan page, and its print view.

## Phase 8 — Post-swap 🟠

- Broken-image (P3) check over the new R2 URLs (network) → park any 404s.
- Re-run the deterministic audit ledger against the new catalog (the run1 tooling) for a fresh
  buildability baseline — Kreg step text is generally fuller, so expect a different profile.
- Visual smoke at 375 / 1280, light + dark, print.

---

## Decisions this needs from you

| # | Decision | Recommendation |
|---|---|---|
| G1 | Legal/provenance for republishing Kreg content | **Blocker — resolve first** |
| G2 | Image hosting: re-host to R2 vs allowlist | **Re-host to R2** |
| G3 | Keep heuristic time/cost or supply real | Keep as placeholder (tiers only shown) |
| 4 | DB prune method: reset vs prune-script | **Reset** (not launched) — after verifying cascade |
| 3b | 5 learning paths: delete now vs re-curate | **Delete now**, re-curate later |
| 5 | Accept the ~489 plans with no cut list, or do the 2nd parse pass first | your call; swap works either way |

## Critical-path order

G1 (legal) → G2 (R2 decision) → Phase 2 (image re-host, the long pole) → Phases 1/3/4 (fast) →
Phase 5 gate + fix tests → 6 push → 7 seed+prune → 8 verify.

**The long pole is image re-hosting; the one true blocker is G1.** Everything else is a day of
scripted work + test fixups.
