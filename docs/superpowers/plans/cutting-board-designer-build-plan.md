# Cutting Board Designer — Notch Build Plan

**Status:** **Scheduled** — Sprint 47+ (`BUILD_PLAN` §4).  
**Promoted:** 2026-07-24 from `FUTURE_IDEAS.md` (Keagan).  
**Decisions:** `DECISIONS_LOG.md` 2026-07-24 — Cutting Board Designer.  
**Execution brief date:** 2026-07-24 (revised same day after product calls)  
**References researched:** [cuttingboarddesigner.app](https://cuttingboarddesigner.app) (live), [MvRens/CuttingBoard](https://github.com/MvRens/CuttingBoard), [ryan-parag/cutting-board-designer-rebuild](https://github.com/ryan-parag/cutting-board-designer-rebuild)

---

## 0. Scope gate & settled product calls

| Item | Binding (Keagan 2026-07-24) |
|---|---|
| On roadmap? | **Yes** — Sprint 47+. |
| Closest shipped analog | Sprint 15 cut-list optimizer: `src/lib/cut-optimizer.ts` + `/plans/[slug]/boards` |
| Monetization | **$0 / Hobby.** No PRO paywall, ads, or affiliate lumber links. |
| Auth | **Sign-in required** for all `/designer(.*)`. Do **not** add to `public-routes.ts`. |
| Nav | **Hard** — signed-in nav `Designer`; landing CTA `Design a board →` (copy settled) |
| Shopping list | **Later phase** — not MVP. |
| Preview bar | **3D is the differentiator.** Lightweight shell OK early; “done” includes modern sleek real-time 3D. |
| Thumbs / Blob | Not required for MVP. |
| Copy | Settled — see DECISIONS_LOG 2026-07-24 copy table. |

---

## 1. Problem & product framing

### Who
Hobby / intermediate woodworkers already browsing Notch’s `cutting-boards` catalog who want to **design their own edge- or end-grain board** instead of (or before) following a published plan.

### Job to be done
> “Show me what this strip layout will look like in a believable 3D board I can orbit, how many slices I get after kerf, and give me a cut list I can print/save — shopping list comes once the designer feels solid.”

### Success criteria (MVP / first shippable)
1. Signed-in user can start from a template or blank board and produce a valid edge- or end-grain design quickly.
2. **Modern real-time 3D preview** (orbit/zoom, wood materials) updates as strips/species/dimensions change — this is the quality bar, not a later PRO upsell.
3. Cut list + board-feet (with waste margin) + finished dimensions are correct for kerf + slice count (golden fixtures).
4. User can export PNG (and/or capture from 3D) and print; designs persist to their account.
5. Feels native: Oak & Forest tokens, tape-measure fractions, cost **tiers only** if shown, Clerk session identity.
6. Discoverable via **hard nav**: signed-in `Designer`; landing `Design a board →`.

### Explicitly not MVP
Shopping-list push; anonymous use; PRO/paywall; AR; publishing designs into the public catalog.

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
| 2D preview | Free (textured) | CSS/SVG color blocks | — | Optional early shell / print fallback |
| 3D preview | PRO (Three-like) | No | Three.js / R3F | **Adopt as core differentiator** |
| AR | PRO / native | No | No | **Out** |
| Undo/redo | Not observed | No | No | **Phase 2** (nice) |
| Cut list / BF | Yes + 15% margin | Layer table + BOM | Metrics BF + cost $ | **Adopt** BF + margin; **adapt** cost → tiers only |
| PNG export | Yes | Print CSS | Optional / incomplete | **Adopt** (incl. 3D capture) |
| SVG/PDF | No (observed) | Print | Mentioned optional | Print page MVP |
| Share URL | Project UUID URLs | MsgPack hash in URL | Optional checklist item | **Phase 2** |
| Persistence | Local free / cloud PRO | URL hash + JSON file | localStorage + Supabase | **Clerk + Prisma only** (sign-in required) |
| Custom woods | PRO | Yes (name+color) | Catalog + price/Janka | Curated list MVP; custom Phase 2 |
| Auth | Optional | None | Supabase | **Clerk; entire tool gated** |
| Shopping list | N/A | N/A | N/A | **Later Notch phase** |
| Licensing | Proprietary product | **Unlicense** | **No LICENSE** | Clean-room; do not vendor ryan-parag code |

### What to adopt / adapt / defer

**Adopt:** strips + kerf + flip/rotate; templates; live metrics/cut list; **real-time 3D board** (R3F-style architecture, clean-room).

**Adapt:** tiers-only cost if shown; tape fractions; Prisma/Clerk; private routes + SW denylist; hard nav with Keagan copy; `Part[]` emission ready for later shopping/optimizer.

**Defer:** shopping-list push; AR; angled strips; multi-board editor; share links; anonymous try; freemium.

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

### MVP (Sprint 47+ — first shippable)
1. Pure geometry + metrics library (strips → finished size, slices, BF, waste, `Part[]` for later).
2. Curated wood species (color + name; procedural/safe 3D materials — no scraped photo textures).
3. Designer island: strip list, board settings, templates, cut-list panel.
4. **Modern 3D preview** (orbit/zoom, edge + end grain appearance) as the primary canvas — optional thin 2D/skeleton only as an early scaffolding step, not the product bar.
5. Private routes only: `/designer`, library, `[id]`, print — Clerk-gated.
6. Save/load designs; PNG export (incl. canvas capture); print cut list.
7. Hard nav entry once Keagan supplies copy.

### Phase 2 (after designer feels solid)
- Shopping-list materials push + optional `optimize()` / `BoardBar` buy plan.
- Undo/redo; share links; multi-panel end-grain; trailing angle; custom species.

### Out of scope until re-decided
- AR / native apps; catalog publishing of user designs; dollar pricing / affiliate / PRO; AI generation; CNC; metric-primary.

---

## 4. UX / IA

### Primary flows

```text
Hard nav / landing CTA (Keagan copy)
    → sign-in if needed
    → /designer
        → Template picker
        → Editor (3D preview | strips | settings | cut list)
            → Export PNG / Print / Save
            → /designer/library
        → (Phase 2) Add materials → /shopping-list
```

### Screens
| Surface | Auth | Purpose |
|---|---|---|
| `/designer` | **Private** | New/edit draft |
| `/designer/library` | Private | Saved designs |
| `/designer/[id]` | Private (owner) | Open saved |
| `/designer/[id]/print` | Private (owner) | Print cut list |

Do **not** add these to `src/lib/public-routes.ts`. Add `/designer` to `NEVER_CACHE_PREFIXES` in `public/sw-policy.js`.

### Editor IA (desktop)
- **Center:** **3D board** (primary); edge vs end appearance via model/toggles.
- **Right panel:** Board settings → Strips → Cut list / metrics.
- **Top bar:** Back, name, template, Export, Save, Print.
- **Mobile:** 3D on top; sheet for controls; editing remains desktop-primary.

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

### Rendering stack — recommendation (revised for Keagan’s 3D bet)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| SVG / Canvas 2D | Light, print-friendly | Not the differentiator you want | **Scaffold only** if needed |
| **Three.js / React Three Fiber** | Orbit/zoom, materials, matches “modern sleek”; ryan-parag proves strip→mesh mapping | Bundle size, mobile GPU, CSP/nonce, Next client-island discipline | **MVP product bar** |
| Full photoreal / AR | Wow | Cost, device limits, IP textures | **Out** |

**Rationale:** Live app gates 3D behind PRO; Notch ships 3D as the free first-party experience — that’s the wedge. Use `@react-three/fiber` + `@react-three/drei` in a **dynamically imported client island** (`ssr: false`). Procedural or hand-authored PBR-ish wood materials from curated hex/species — never hotlink or rip live-app textures.

**Performance:** code-split 3D chunk; cap strip count; pause loop when tab hidden; degrade gracefully on weak GPUs (static frame + message) without blocking cut-list editing.

### State / history
- Client store inside the island only.
- Server is source of truth for saved designs; optional local draft buffer while signed in.
- Undo/redo Phase 2.

### Persistence
- Prisma `BoardDesign` + Clerk `requireUser()`; IDOR-safe queries.
- No Supabase; no anonymous public designs.

### Exports
- PNG from WebGL canvas capture and/or orthographic snapshot.
- Print route for cut list (2D/print-safe; don’t rely on WebGL for paper).

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

### Routes (binding)
| Path | Auth | Notes |
|---|---|---|
| `/designer` | **Private** | Not on allowlist |
| `/designer/library` | Private | Own designs |
| `/designer/[id]` | Private (owner) | |
| `/designer/[id]/print` | Private (owner) | |

### Files likely involved (repo-relative)

| Area | Paths |
|---|---|
| App routes | `src/app/designer/page.tsx`, `library/page.tsx`, `[id]/page.tsx`, `[id]/print/page.tsx` |
| Island UI | `src/components/designer/*` (shell, **r3f-canvas**, strip-list, settings, templates, metrics) |
| Lib | `src/lib/board-designer/*`, `src/lib/board-designs.ts` |
| Actions | `src/app/actions/board-designs.ts` |
| Schema | `prisma/schema.prisma` + migration |
| SW | `public/sw-policy.js` — `/designer` in `NEVER_CACHE_PREFIXES`; `tests/offline.test.ts` |
| Nav | header / landing — settled copy (`Designer`, `Design a board →`) |
| Deps | `three`, `@react-three/fiber`, `@react-three/drei` (verify free/compatible; no paid SDK) |
| Format / cost | `src/lib/format.ts` — fractions; no dollar UI |

### Auth / permissions
- Every page/action: `requireUser()` / session-scoped queries.
- Unsigned hit → Clerk sign-in with `safeReturnTo` back to `/designer`.

### Design-system reuse
- Tokens from `src/app/globals.css` / `DESIGN_BRIEF.md`.
- Prefer existing form controls / buttons; avoid new card-heavy chrome.
- Print CSS: forced light; keep classes on elements (CLAUDE.md §8).

### How a design becomes a Notch artifact
```text
BoardDesign.config
  → metrics + cut list + 3D preview + PNG/print   (MVP)
  → metrics.toParts() → Part[]                    (ready in lib)
  → ShoppingListEntry / optimize()                (Phase 2 / U6)
```
**Not** auto-creating a catalog `Plan` (community submissions — parked).

---

## 8. Implementation units

### U0 — Product gate
- ✅ Done 2026-07-24 (promotion + product calls + recommended copy accepted).

### U1 — Domain library
**Files:** `src/lib/board-designer/{types,species,metrics,to-parts,templates,serialize}.ts`, `tests/board-designer-*.test.ts`
**Acceptance:** golden kerf/slice/BF fixtures; zod round-trip; `toParts()` accepted by `optimize()` (for Phase 2).
**Tests:** checkerboard fixture; zero-slice warning; waste factor; serialize identity.

### U2 — Private routes + persistence
**Files:** `src/app/designer/**`, `src/lib/board-designs.ts`, `src/app/actions/board-designs.ts`, Prisma migration, `public/sw-policy.js`, offline tests
**Acceptance:** unsigned → sign-in; owner-scoped CRUD; no public-routes entry.
**Tests:** IDOR; rate-limit no-throw; `/designer` in NEVER_CACHE_PREFIXES.

### U3 — Editor chrome (+ optional lightweight preview)
Strip list, settings, templates, metrics panel; thin preview OK as scaffold.
**Not** MVP-complete without U4.

### U4 — 3D product preview (MVP quality bar)
**Files:** `src/components/designer/r3f-*`, wood materials; `three` / R3F / drei via dynamic import
**Acceptance:** orbit/zoom; edge vs end; live strip updates; Notch-looking; PNG capture.
**Tests:** mapping unit tests where practical; manual desktop + one mobile GPU pass.

### U5 — Print + hard nav
Print cut list; ship settled copy:
- `SIGNED_IN_NAV`: `{ href: '/designer', label: 'Designer' }`
- Landing secondary CTA: `Design a board →` → `/designer`
- Library empty: `No boards saved yet. Start from a template.`
- Page h1: `Board designer`; library heading: `Your boards`
`noindex` on tool routes.

### U6 — Phase 2: shopping list + optimizer panel
Materials → `ShoppingListEntry`; optional `BoardBar` / `optimize()`.

### U7 — Phase 2 polish
Undo, share, multi-panel, angles, custom species.

## 9. Risks & remaining opens

### Risks
| Risk | Why | Mitigation |
|---|---|---|
| Geometry wrong | Waste lumber / trust | Golden fixtures like cut-optimizer |
| 3D quality / perf | Core bet fails on mid phones | Code-split; degrade; desktop-first polish |
| Texture/IP | Live-app woods proprietary | Procedural materials only |
| Bundle / CSP | WebGL + Clerk nonce | Dynamic island; follow existing CSP patterns |
| Cost UI regression | $ creep via BF×price | No species price fields |
| Hard nav without copy | Wrong brand voice | Block chrome strings until Keagan writes them |
| Shopping deferred too long | Feels like a toy vs Notch | Keep `Part[]` clean; schedule U6 deliberately |

### Settled (do not re-ask)
Schedule Now · Sign-in required · Hard nav · Shopping later · 3D = differentiator · **Copy pack above**.

### Copy pack (binding)
| Surface | String |
|---|---|
| Nav | `Designer` |
| Page h1 | `Board designer` |
| Landing CTA | `Design a board →` |
| Landing support (if section) | `Design edge- and end-grain cutting boards with a live 3D preview.` |
| Library empty | `No boards saved yet. Start from a template.` |
| Library heading | `Your boards` |

---

## 10. Milestones & verification

### First shippable (“MVP”) done when
1. U1–U5 complete (domain, private persist, **3D quality bar**, print, hard nav with approved copy).
2. Manual: template → edit → 3D updates → kerf changes slice math → save → library → print → PNG; sign-out cannot open `/designer`.
3. No shopping-list requirement yet (U6 later).
4. CI green; offline denylist covers `/designer`; no dollar formatters; self-score ≥95%.

### Automated checks (minimum)
- Metrics/serialize/authz tests as in U1–U2.
- Offline + public-routes: designer private.
- `tests/format.test.ts` still forbids dollar formatters.

---

## Confidence check

| Sure | Assumption-based | Top risks now |
|---|---|---|
| Product calls + copy logged; feature scheduled | Exact 3D aesthetic bar (“sleek”) | (1) 3D polish/perf |
| Sign-in-only + SW denylist path | Species material look | (2) Geometry trust |
| Shopping intentionally later | — | (3) Bundle/CSP for R3F island |

**Bottom line:** Build a **sign-in-gated, 3D-led** Notch designer with settled chrome copy; shopping later. Clean-room only. U0 complete — implementation may start at U1.
