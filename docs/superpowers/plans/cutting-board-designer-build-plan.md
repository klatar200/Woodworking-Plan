# Cutting Board Designer — Notch Build Plan

**Status:** Planning only — **not scheduled for implementation**.  
**Canonical parking:** `FUTURE_IDEAS.md` (2026-07-19) — *“edge/end-grain cutting-board designer (interactive tool ~ 2nd cut-list optimizer)”*.  
**Gate:** Keagan must promote this into `BUSINESS_PLAN.md` + `BUILD_PLAN.md` §4 before any code sprint. This document is the execution brief once that happens.  
**Date:** 2026-07-24  
**References researched:** [cuttingboarddesigner.app](https://cuttingboarddesigner.app) (live), [MvRens/CuttingBoard](https://github.com/MvRens/CuttingBoard), [ryan-parag/cutting-board-designer-rebuild](https://github.com/ryan-parag/cutting-board-designer-rebuild)

---

## 0. Scope gate & assumption

| Item | Decision |
|---|---|
| Is this in current roadmap? | **No.** Parked in `FUTURE_IDEAS.md`. Absent from `BUILD_PLAN` §4. |
| Closest shipped analog | Sprint 15 cut-list optimizer: `src/lib/cut-optimizer.ts` + `/plans/[slug]/boards` |
| Monetization | **Must stay $0 / Hobby.** Live reference is freemium ($9.99/yr PRO). Notch must **not** copy paywalls, ads, or affiliate lumber links. |
| Recommended default if promoted | Ship as a **first-party workshop tool** (like `/workshop` inventory), not a clone of the commercial web app. Anonymous design OK; cloud save gated by Clerk (same pattern as saves/collections). |

**Assumption used below (labeled):** Implementation is approved as a free Notch surface with no PRO tier, no dollar cost UI, imperial fractions first, 2D-first rendering, and designs that can emit into existing Notch cut/shopping primitives.

---

## 1. Problem & product framing

### Who
Hobby / intermediate woodworkers already browsing Notch’s `cutting-boards` catalog who want to **design their own edge- or end-grain board** instead of (or before) following a published plan.

### Job to be done
> “Show me what this strip layout will look like, how many slices I get after kerf, and exactly what stock to buy — then let me print it and add materials to my shopping list.”

### Success criteria (MVP)
1. User can start from a template or blank board and produce a valid edge-grain or end-grain design in under 5 minutes.
2. Preview updates live as strips/species/dimensions change.
3. Cut list + board-feet (with waste margin) + finished dimensions are correct for kerf + slice count (golden fixtures).
4. User can export a PNG (or print view) and, if signed in, save the design and push materials into the existing shopping list.
5. Feels native: Oak & Forest tokens, tape-measure fractions, cost **tiers only**, Clerk session identity, no parallel auth/DB stack.

### Non-goals for MVP
Pixel-clone of cuttingboarddesigner.app; AR; native apps; marketplace; AI redesign; metric as primary; selling lumber; publishing user designs into the public catalog.

---

## 2. Reference synthesis

### Capability matrix

| Capability | Live app (cuttingboarddesigner.app) | MvRens/CuttingBoard | ryan-parag rebuild | Notch MVP adopt? |
|---|---|---|---|---|
| Strip/layer model (species + width) | Yes (“layers”) | Yes (`boards[].layers`) | Yes (`strips[]`) | **Adopt** |
| Edge vs end grain | Rotate/flip toggles | Edge + end previews; multi-board end-grain order | `boardType` + flip/rotate | **Adopt** (single panel first) |
| Multi-panel glue-ups | Implicit via slices | Explicit multi-board → end-grain order | Single panel | **Defer** (Phase 2) |
| Kerf-aware slicing | Yes (default ~0.13″) | Yes (`bladeKerf`) | Yes (`kerf` 0.125″) | **Adopt** |
| Templates / presets | 6 templates (some PRO) | Defaults only | Presets / loadPreset | **Adopt** 3–4 free templates |
| Trailing angle / diagonal | PRO-adjacent | No | Field exists (`trailingAngle`) | **Defer** |
| 2D preview | Free (textured) | CSS/SVG color blocks | — | **Adopt** (SVG primary) |
| 3D preview | PRO (Three-like) | No | Three.js / R3F | **Defer** (Phase 2) |
| AR | PRO / native | No | No | **Out** |
| Undo/redo | Not observed | No | No | **Phase 2** (nice) |
| Cut list / BF | Yes + 15% margin | Layer table + BOM | Metrics BF + cost $ | **Adopt** BF + margin; **adapt** cost → tiers only |
| PNG export | Yes | Print CSS | Optional / incomplete | **Adopt** |
| SVG/PDF | No (observed) | Print | Mentioned optional | Print page MVP; SVG Phase 2 |
| Share URL | Project UUID URLs | MsgPack hash in URL | Optional checklist item | **Phase 2** (signed-in share) |
| Persistence | Local free / cloud PRO | URL hash + JSON file | localStorage + Supabase | **Adapt** → local draft + Clerk/Postgres |
| Custom woods | PRO | Yes (name+color) | Catalog + price/Janka | Curated list MVP; custom Phase 2 |
| Auth | Optional | None | Supabase | **Reuse Clerk** |
| Licensing | Proprietary product | **Unlicense** | **No LICENSE** (assume all rights reserved) | Clean-room inspiration; do not vendor ryan-parag code |

### What to adopt / adapt / defer

**Adopt (interaction + domain):**
- Ordered strips with species + width.
- Board params: source length, stock thickness, finished strip/row height or end-grain slice thickness, kerf.
- Pattern toggles: flip every other, rotate every other (end-grain).
- Live preview + live cut-list/metrics.
- Starter templates (blank stripes, classic stripes, checkerboard / alternating).

**Adapt to Notch:**
- Cost → `costTierForCents` / `$`…`$$$$$` only (no `pricePerBF` UI; optional internal cents for tier derivation later).
- Dimensions → `formatInches` tape fractions (`src/lib/format.ts`), not decimal-only.
- Persistence → Prisma + Clerk, not Supabase.
- Cut list → emit `Part[]` compatible with `src/lib/cut-optimizer.ts` so “what to buy” reuses Sprint 15.
- Visual language → Notch tokens (`globals.css`), not reference chrome.
- Routing / SW / allowlist → existing security model.

**Defer:**
- 3D/AR, angled strips, multi-board end-grain assembly editor, cloud share links, custom species editor, metric-primary, dollar pricing, freemium gating, blog/SEO microsite.

### Repo structural notes (inspiration only)

| Repo | Stack | Domain shape | Render | State / history | Export | Layout worth mirroring |
|---|---|---|---|---|---|---|
| MvRens | Vue 3 + Vuex | `settings`, `wood[]`, `boards[{thickness,length,layers[{wood,width}]}]`, derived `endGrain[]` | Component previews (DOM), color fills | Vuex; URL MsgPack+base64; JSON file | Print + download JSON | Split: Settings / Layers / Edge preview / End preview / CuttingList — good IA |
| ryan-parag | React + Zustand + R3F + Supabase | `BoardConfig` + `Strip` + `BoardMetrics` (very close to live app) | Three.js scenes for edge & end | Zustand `persist` (localStorage); no undo stack | Save design; export incomplete | **Strong module split:** `types/board.ts`, `store/`, `data/species.ts`, `components/{Canvas,StripController,BoardSettings,MetricsSummary}`, step walkers for glue-up narrative |

**Licensing:**
- MvRens: Unlicense — legally permissive; still prefer **clean-room** algorithms in Notch style (typed pure libs + Vitest) rather than porting Vue components.
- ryan-parag: no license file → **do not copy source**; treat as structural/domain inspiration only.
- Live app: proprietary → capabilities/patterns only; zero code/assets reuse (especially wood photo textures).

---

## 3. Scope

### MVP (Phase A — first buildable sprint set)
1. Pure geometry + metrics library (strips → finished size, slices, BF, waste, `Part[]`).
2. Curated wood species catalog (color + display name; optional hardness metadata unused in UI).
3. Designer client island: canvas (SVG), strip list, board settings, templates.
4. Routes: public design surface + signed-in library of saved designs.
5. PNG export of 2D top view; print view for cut list / glue-up summary.
6. “Add to shopping list” for signed-in users (mapped materials).
7. Optional: feed `Part[]` into existing `optimize()` for a board-buy plan panel (reuse `BoardBar`).

### Phase 2
- Undo/redo history.
- Shareable read-only links for a design (owner-controlled).
- Multi-panel / multi-glue-up end-grain editor (MvRens strength).
- Trailing-angle / herringbone.
- Lightweight 3D orbit preview (opt-in island; code-split).
- Custom species (name + hex only).
- SVG download; glue-up step narrative UI (ryan-parag `steps/*` pattern).

### Later / out of scope until re-decided
- AR / native apps.
- Publishing designs into `content/plans` / public catalog (licensing + QC).
- Dollar lumber pricing, affiliate links, PRO subscriptions (Hobby + launch economics forbid).
- AI pattern generation (overlaps parked “AI plan customization”; inference cost).
- CNC toolpaths.
- Metric as primary unit system (BUSINESS_PLAN/FUTURE_IDEAS stance on dishonest 2×4 conversion — display conversion only if ever needed).

---

## 4. UX / IA

### Primary flows

```text
Browse / Workshop CTA
    → /designer                 (anonymous OK: draft in memory + localStorage)
        → Template picker
        → Editor (preview | strips | settings | cut list)
            → Export PNG / Print
            → Sign in to Save
            → /designer/library (signed-in)
            → Add materials → /shopping-list
            → (optional) “Board plan” using optimize()
```

### Screens
| Surface | Purpose |
|---|---|
| `/designer` | New/edit current draft (full-viewport workshop tool) |
| `/designer/library` | Saved designs (signed-in) |
| `/designer/[id]` | Open saved design |
| `/designer/[id]/print` | Printable cut list + preview (Ctrl+P → PDF) |

### Editor IA (desktop)
- **Left/center:** 2D preview (top view); toggle Edge vs End appearance.
- **Right panel:** Board settings → Layers/strips → Cut list / metrics.
- **Top bar:** Back, design name, template, Export PNG, Save, Print.
- **Mobile:** Stack preview on top; bottom sheet for strips/settings; accept that dense editing is desktop-primary (matches live web app).

### Key interactions
- Add / duplicate / delete strip; reorder (up/down buttons MVP; drag Phase 2).
- Change species (swatch grid).
- Edit width with fraction-friendly input (snap to 1/16″).
- Adjust length, thickness, slice thickness, kerf (reuse kerf option vocabulary from optimizer where possible).
- Toggle flip / rotate every other.
- Load template (replaces strips; confirms if dirty).

### Empty / error / edge states
| State | Behavior |
|---|---|
| Zero strips | Empty preview + CTA “Add a strip” or “Load template”; cut list shows impossible/empty loudly |
| Invalid input (≤0 width, kerf &lt; 0) | Clamp or reject with inline message; never silent NaN |
| Slice count = 0 (kerf too large / length too small) | Loud warning: “No slices fit — reduce kerf or increase length” |
| Unsigned Save | Bounce to sign-in with `safeReturnTo` back to designer |
| Library empty | Template CTAs |
| Texture/color missing species | Fallback solid swatch; never crash |

---

## 5. Domain model

### Core entities (directional)

```text
WoodSpecies { id, name, colorHex, foodSafe?: boolean }
  // curated in code or content JSON — not user table in MVP

Strip { id, speciesId, widthIn, repeat?: number }  // trailingAngle deferred

BoardDesign {
  id?, name,
  grain: 'edge' | 'end',
  sourceLengthIn,     // length of first glue-up panel
  stockThicknessIn,   // thickness of stock / finished end-grain height source
  stripHeightIn,      // row height in first glue-up (edge) OR endGrainThickness (slice thickness)
  kerfIn,
  flipEveryOther: boolean,
  rotateEveryOther: boolean,
  strips: Strip[],
  wasteFactor: number,  // default 0.15 — same idea as live app & optimizer waste
  schemaVersion: 1
}

DerivedMetrics {
  finishedWidthIn,      // Σ strip widths (* repeat)
  finishedLengthIn,     // edge: sourceLength; end: slices * stockThickness (after rotate model)
  finishedThicknessIn,
  sliceCount,
  leftoverIn,
  boardFeetBySpecies: Record<speciesId, number>,
  totalBoardFeet,
  parts: Part[],        // for cut-optimizer
  warnings: string[]
}
```

### Invariants
1. All dimensions stored as **inches floats**; display via `formatInches`.
2. Kerf ≥ 0; widths &gt; 0; at least one strip for a “complete” design.
3. Grain orientation does not silently rotate parts when emitting buy-plan `Part[]` (align with cut-optimizer grain rule).
4. Impossible / zero-slice outcomes are **reported**, never dropped.
5. Species ids are stable slugs; deleting a curated species requires migration of saved JSON.
6. Cost: if ever derived, only expose **tier**; never render `$12.34`.

### Serialization shape (saved design JSON)
```json
{
  "schemaVersion": 1,
  "name": "Walnut Maple Checker",
  "grain": "end",
  "sourceLengthIn": 20,
  "stockThicknessIn": 1.5,
  "stripHeightIn": 1,
  "kerfIn": 0.125,
  "flipEveryOther": false,
  "rotateEveryOther": true,
  "wasteFactor": 0.15,
  "strips": [
    { "id": "s1", "speciesId": "walnut", "widthIn": 1 },
    { "id": "s2", "speciesId": "maple", "widthIn": 1 }
  ]
}
```

Metrics are **computed on read**, not trusted from client on write (recalculate server-side on save).

### Persistence (recommended)
New Prisma model (MVP cloud save):

```text
BoardDesign
  id, userId, name, slug?,
  config Json,          // BoardDesign serialization
  thumbnailUrl String?, // optional blob later
  createdAt, updatedAt
  @@index([userId, updatedAt])
```

- Owner always from session (`requireUser()`), never client `userId`.
- Cascade delete with User (extend `user-deletion.ts` if thumbnails use Blob).

---

## 6. Technical approach

### Rendering stack — recommendation

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **SVG 2D** | Crisp print/export, easy hit-testing, SSR-friendly shell, small bundle | Textures less “photo real” | **MVP default** |
| Canvas 2D | Fast texture fills | Harder a11y/print; hit-testing manual | Alt for texture layer if needed |
| Three.js / R3F | Matches ryan-parag / live PRO | Heavy for Next, mobile cost, CSP/nonce care | **Phase 2** code-split island only |

**Rationale:** Notch already ships SSR-first pages and print-as-PDF. The live app’s free tier is 2D. SVG keeps MVP honest and testable (DOM assertions). Procedural or CSS grain (subtle) beats shipping copyrighted photo textures.

### State / history
- Client editor state in a small store (React state or Zustand **inside the island only** — don’t invent a global app store).
- Dirty flag; `beforeunload` warn.
- localStorage draft key `notch.designer.draft.v1` for anonymous continuity.
- Undo/redo: command stack Phase 2; MVP confirm on destructive clear/template replace.

### Persistence
1. Draft: localStorage (anon + signed-in autosave buffer).
2. Saved: server actions → Prisma `BoardDesign` (signed-in).
3. No Supabase / parallel auth.

### Exports
- **PNG:** client SVG → canvas serialize → download.
- **Print:** dedicated print route (mirror `/plans/[slug]/print` patterns: black-on-white, keep print classes on elements).
- **JSON:** download/upload of serialization (MvRens pattern) — useful for support & tests.

### Performance constraints
- Recalc metrics O(strips) on every edit — fine under ~100 strips; soft-cap strip count (e.g. 64) with warning.
- Debounce PNG export; don’t block typing.
- No WebGL on MVP path → avoids GPU/CSP surprises on low-end phones.
- Designer page: dynamic import the island (`next/dynamic`, `ssr: false` for canvas bits if needed).

### Pure lib placement (mirror cut-optimizer)
```text
src/lib/board-designer/
  types.ts
  species.ts          // curated catalog
  metrics.ts          // calculateMetrics
  to-parts.ts         // → Part[]
  templates.ts
  serialize.ts        // zod parse + schemaVersion
```
All Vitest-covered; UI is a thin adapter.

---

## 7. Notch integration plan

### Routes (proposed)
| Path | Auth | Notes |
|---|---|---|
| `/designer` | **Public** (add to `src/lib/public-routes.ts` — security decision) | Drafting tool; no other user’s data |
| `/designer/library` | Private | List own designs |
| `/designer/[id]` | Private (owner) | Edit saved |
| `/designer/[id]/print` | Private (owner) | Print |

**Alternative (if Keagan prefers fail-closed):** keep entire `/designer(.*)` private — forces sign-in before try. **Recommended:** public draft + gated save (matches BUSINESS_PLAN habit-building: content/tools free, persistence gated).

### Files likely involved (repo-relative)

| Area | Paths |
|---|---|
| App routes | `src/app/designer/page.tsx`, `library/page.tsx`, `[id]/page.tsx`, `[id]/print/page.tsx` |
| Island UI | `src/components/designer/*` (editor shell, svg-preview, strip-list, settings, template-picker, metrics-panel) |
| Lib | `src/lib/board-designer/*`, `src/lib/board-designs.ts` (CRUD) |
| Actions | `src/app/actions/board-designs.ts` (`guardAction`, rate limit, `safeReturnTo`) |
| Schema | `prisma/schema.prisma` + migration |
| Auth allowlist | `src/lib/public-routes.ts` (+ tests) |
| SW | `public/sw-policy.js` — add `/designer/library`, `/designer/` private ids to `NEVER_CACHE_PREFIXES` as needed; public `/designer` cacheable only if no private JSON in HTML |
| Shopping | `src/lib/shopping-list.ts` + action to insert derived materials |
| Optimizer reuse | `src/lib/cut-optimizer.ts`, `src/components/board-bar.tsx` |
| Format / cost | `src/lib/format.ts` — fractions + tiers only |
| Nav entry | site header / workshop / browse empty-state CTA (copy = Keagan) |
| Deletion | `src/lib/user-deletion.ts` if blobs |
| SEO | `noindex` on designer tools (like boards/print/build) unless product wants indexable landing |

### Auth / permissions
- `getCurrentUser` / `requireUser` only.
- Library queries always `where: { userId: sessionUser.id }`.
- Public `/designer` must not embed other users’ designs.

### Design-system reuse
- Tokens from `src/app/globals.css` / `DESIGN_BRIEF.md`.
- Prefer existing form controls / buttons; avoid new card-heavy chrome.
- Print CSS: forced light; keep classes on elements (CLAUDE.md §8).

### How a design becomes a Notch artifact
```text
BoardDesign.config
  → metrics.toParts() → Part[]
  → optimize(parts) → board buy plan (optional panel)
  → materials[{name, species, unit, qty}] → ShoppingListEntry (explicit add)
  → PNG / print → user keeps offline reference
```
**Not** auto-creating a `Plan` row in the catalog (that would be community submissions / licensing — parked).

---

## 8. Implementation units

Sequenced work packages. Each is independently shippable once the feature is on `BUILD_PLAN` §4.

### U0 — Product gate (non-code)
- Promote out of `FUTURE_IDEAS` → `BUSINESS_PLAN` + `BUILD_PLAN` §4.
- Settle open decisions in §9 (public vs private route, nav placement, copy).
- Record in `DECISIONS_LOG.md`.

### U1 — Domain library (foundation)
**Depends on:** U0  
**Files:** `src/lib/board-designer/{types,species,metrics,to-parts,templates,serialize}.ts`, `tests/board-designer-*.test.ts`

**Acceptance:**
- Given strips + kerf, metrics match golden fixtures for edge and end modes.
- `toParts()` output accepted by `optimize()` without transformation hacks.
- Zod rejects unknown schema / invalid dimensions.

**Tests:**
- Checkerboard 6× alternating 1″ strips, length 20″, kerf 0.125″, end thickness 1″ → expected slice count + finished L×W×T.
- Kerf too large → `sliceCount === 0` + warning string present.
- Waste factor 0.15 increases BF vs raw sum.
- `formatInches` used by UI consumers (lib returns numbers; display test in component later).
- Serialize → deserialize round-trip identity.

### U2 — Designer island (UI shell, no DB)
**Depends on:** U1  
**Files:** `src/components/designer/*`, `src/app/designer/page.tsx`, public-routes + offline tests if public

**Acceptance:**
- Template → edit strips → live SVG preview + metrics panel.
- localStorage draft restores after refresh.
- PNG export downloads.
- Light + dark token contrast OK (manual + existing contrast guards still green).

**Tests:**
- Render strip list: add/remove updates count.
- Preview exposes aria labels for species bands.
- Invalid width shows error; preview does not render NaN.
- `tests/offline.test.ts` updated for any new private prefixes.
- Public route allowlist test includes `/designer` only if chosen public.

### U3 — Persistence (Clerk + Prisma)
**Depends on:** U2  
**Files:** `prisma/schema.prisma`, migration, `src/lib/board-designs.ts`, `src/app/actions/board-designs.ts`, `src/app/designer/library/page.tsx`, `src/app/designer/[id]/page.tsx`

**Acceptance:**
- Signed-in save/list/rename/delete; IDOR attempt with another user’s id returns bounce/not found.
- Server recalculates/ignores client metrics on write.
- Rate limit false → no-op (no throw).

**Tests:**
- `board-designs` lib: create scoped to user; getById other user → null.
- Action guard: anonymous save redirects to sign-in with return URL.
- form fields bounded (`formString`/`formInt` patterns).

### U4 — Print + shopping list + optimizer panel
**Depends on:** U1–U3  
**Files:** `src/app/designer/[id]/print/page.tsx`, shopping-list action glue, optional `BoardBar` embed

**Acceptance:**
- Print view shows fractions, cut list, species BF, finished size; Ctrl+P usable.
- “Add to shopping list” creates entries with waterproof glue note if applicable (existing shopping rules).
- No dollar amounts anywhere (`tests/format.test.ts` still asserts absence).

**Tests:**
- Print render contains species names + `formatInches` outputs.
- Shopping add is exact-merge safe (name/unit/species).
- Optimizer panel: known parts → expected board count for fixture.

### U5 — Polish / Phase 2 hooks (optional same epic)
Undo stack, share link, drag-reorder, 3D island — only if scheduled.

---

## 9. Risks & open decisions

### Risks
| Risk | Why it matters | Mitigation |
|---|---|---|
| Geometry wrong (kerf/slices) | Users waste lumber; trust damage | Golden fixtures; treat like cut-optimizer invariants |
| Texture/IP | Photo woods from live app are proprietary | Procedural/CSS colors only; curated hex palette |
| Scope creep toward clone | Freemium 3D/AR/angled | Hard MVP list; Phase 2 parking |
| Parallel systems | Supabase-style second backend | Forbid; Clerk + Prisma only |
| Cost UI regression | Dollar figures reappear via BF×price | No price fields in species MVP; tier-only display |
| Offline cache leak | Saving designs under public cache | Private routes on denylist; careful public draft HTML |
| Mobile editing pain | Live web app is desktop-first | Honest MVP: usable view on mobile, edit desktop-primary |
| FUTURE_IDEAS violation | Building without promotion | U0 gate mandatory |

### Open decisions (need Keagan)

1. **Schedule:** Promote to `BUILD_PLAN` §4 now, later, or never?  
   - *Recommended:* Later, after catalog UX / go-live blockers; keep this plan ready.
2. **Public `/designer` vs sign-in required?**  
   - *Recommended:* Public draft + gated save.
3. **Nav entry & public copy** (branding/copy escalation).  
   - *Recommended:* Soft entry from `/workshop` + cutting-boards browse empty/header link; landing marketing blurb only if Keagan writes it.
4. **Shopping-list integration in MVP or Phase 2?**  
   - *Recommended:* MVP — it’s the Notch differentiator vs standalone designers.
5. **Thumbnail storage** (Blob vs client-only PNG)?  
   - *Recommended:* Client PNG export first; Blob thumbnails Phase 2.

---

## 10. Milestones & verification

### MVP done when
1. U1–U4 merged; CI green (`lint`, `typecheck`, `test`).
2. Manual script:
   - Load Checkerboard template → switch end grain → confirm slice math by hand for one fixture.
   - Change kerf 0 → 0.125 → slice count drops as expected.
   - Export PNG; open print view; Save while signed in; reload library.
   - Add to shopping list; confirm entries on `/shopping-list`.
   - Sign out; confirm library/print not publicly readable.
3. Invariants still hold: published plan filter untouched; cost-tier-only; offline denylist covers private designer routes; no secrets in client.
4. Self-score ≥95% per `BUILD_PLAN` §6 with evidence; `SPRINT_LOG` entry.

### Automated checks (minimum)
- `tests/board-designer-metrics.test.ts` — kerf, slices, BF, warnings.
- `tests/board-designer-serialize.test.ts` — schemaVersion round-trip.
- `tests/board-designs.test.ts` — authz/IDOR.
- `tests/public-routes.test.ts` / offline tests updated.
- `tests/format.test.ts` still forbids dollar formatters.
- Optional component test: designer strip add/remove.

---

## Confidence check

| Sure | Assumption-based | Top 3 risks |
|---|---|---|
| Live app interaction model (strips, kerf, flip/rotate, cut list, PNG, templates) from hands-on inspection | Exact live-app internal geometry formula (re-derived from first principles + ryan-parag metrics as cross-check, not copied) | (1) Kerf/slice math trust |
| Feature is parked in `FUTURE_IDEAS` — must not implement until promoted | Public-vs-private `/designer` preference | (2) Accidental monetization/cost-UI clone |
| Notch integration seams (optimizer, print, shopping, Clerk, allowlist, SW) | Species list & template aesthetics (product taste) | (3) Building before U0 / scope-creep into 3D-AR |
| ryan-parag domain types are the best structural mirror; MvRens Unlicense + multi-board is Phase 2 inspiration | Thumbnail/Blob necessity | |

**Bottom line:** Treat this as the definitive execution brief for a **2D, Notch-native, cut-list-connected** designer. Do not vendor reference code. Do not start U1 until U0 (Keagan promotion + decisions) is done.
