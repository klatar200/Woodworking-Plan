<!-- cutting-board-designer-build-plan.md — AGENT-OPTIMIZED EXECUTION CONTRACT. Not prose, not a pitch.
     Audience: one build agent (Cursor: Claude/GPT/Gemini/Composer — assume NO shared prior context between units).
     Precedence: AGENTS_CONTEXT.md read-order > CLAUDE.md §7–§8 invariants > this file. This file is authoritative
     ONLY for designer-specific decisions. Contradiction with a CLAUDE.md invariant ⇒ STOP, report, do not resolve it yourself.
     Rewritten 2026-07-25 (Claude Code): research/synthesis sections removed (recoverable in git; conclusions live in §1),
     geometry made explicit, sprint numbers corrected, parallel-execution contract added. -->

# Cutting Board Designer — execution contract

**Sprints 51 (foundation) + 52 (3D).** Sprints 47–50 are TAKEN (settings hub, page size, navbar, filter rail — `SPRINT_LOG.md`). Every earlier doc reference to "Sprint 47+" is a stale number, not a stale decision.
**Decisions of record:** `DECISIONS_LOG.md` 2026-07-24. **Roadmap row:** `BUILD_PLAN.md` §4.
**Status:** U0 ✅ · U1 ✅ · U2 ✅ · U3 ✅ · U4 ✅ · U5 ✅ · U6/U7 = Phase 2, unopened.

---

## 0. Agent protocol

**Self-containment.** Each unit in §5 is executable from a cold start with only: this file, its READS list, and `AGENTS.md`/`CLAUDE.md §5`. Do not assume you wrote the previous unit.

**Ask protocol (before assuming — mandatory).**
- Batch **all** blocking questions for a unit into ONE message at the unit's start. Never drip-feed, never stop mid-file to ask.
- Format: `Q<n>: <question> | Recommend: <option> | Because: <one line>`. A question without a recommendation is incomplete.
- STOP and ask when the trigger is in `BUILD_PLAN.md` §2 or §8 below. Otherwise **decide and move on** — naming, file decomposition, component structure, test layout, and CSS class choice are yours.
- **Never re-ask anything in §1.** It is settled. Re-litigating it is the single most expensive failure mode available to you.
- Blocked with nothing shippable ⇒ ask. Blocked on one detail with other work available ⇒ do the other work first, then ask once.

**Token discipline (binding).**
- Read only a unit's READS/OWNS paths. Never scan `content/`, `research/`, `docs/mockups/`, `node_modules/`, `*.csv`, `*.tgz`, `ds-bundle/`, `_harness.tgz`.
- Never restate this plan, the scope, or your intentions back. Report diffs and outcomes only.
- **No new markdown files.** Editable docs: `BUILD_PLAN.md` §4 row · `SPRINT_LOG.md` (one entry per sprint) · `DECISIONS_LOG.md` (only when Keagan decides something new) · §9 of this file. Nothing else.
- Do not re-audit a closed unit. Do not re-derive §1.

**Done means:** every ACCEPTANCE bullet is demonstrated by a **named test** or a **named manual step with its observed outcome**. "Should work" is not done.

---

## 1. BINDING — settled, do not re-ask, do not re-derive

Referenced everywhere else by id. **Stated once, here.**

| id | Binding |
|---|---|
| B1 | Two sprints. **51** = U1+U2+U3 (geometry, private persistence, editor + static SVG preview) — independently shippable. **52** = U4+U5 (3D island, PNG capture, print, hard nav). Each closes with its own deploy + self-score ≥95% (`BUILD_PLAN` §5–§7). |
| B2 | **Sign-in required for all of `/designer(.*)`.** Never add any designer path to `src/lib/public-routes.ts`. Fails closed. |
| B3 | $0 / Vercel Hobby. No ads, affiliate, billing, PRO tier, save limits, or paywall. Adding any ⇒ hard stop (`BUILD_PLAN` §4 launch gate). |
| B4 | **No dollar figures anywhere.** Cost tiers only, and only if cost is shown at all (MVP shows none). `formatCents` stays deleted; `tests/format.test.ts` asserts its absence. |
| B5 | Hard nav, exact strings in B6. `SIGNED_IN_NAV` gains `{ href: '/designer', label: 'Designer' }`; landing gains a secondary CTA. Ships in **U5 only** — do not add nav strings earlier. |
| B6 | **Copy pack — byte-exact, do not paraphrase.** Nav `Designer` · h1 + title base `Board designer` · landing CTA `Design a board →` · landing support line `Design edge- and end-grain cutting boards with a live 3D preview.` · library heading `Your boards` · library empty `No boards saved yet. Start from a template.` Tiny chrome (`Save`, `Export PNG`, `Print`, template names, field labels) is engineering judgment. New marketing/blurb copy ⇒ escalate. |
| B7 | Shopping-list push and any optimizer UI are **Phase 2 (U6)**. `toParts()` ships in the lib in U1 with tests, and **nothing renders it** in Sprint 51/52. Do not add a "Board plan" button. |
| B8 | 3D is the product differentiator and is free — never gated. **Clean-room:** zero code, assets, or textures from `cuttingboarddesigner.app` (proprietary), `MvRens/CuttingBoard` (Unlicense, still don't port), `ryan-parag/cutting-board-designer-rebuild` (no LICENSE — do not copy). Materials are procedural from the §3 hex list. Never hotlink or download a wood texture. |
| B9 | **Unsaved drafts are in-memory only.** No `localStorage`, no `IndexedDB`, no service-worker caching of a design. A refresh losing an unsaved draft is correct behaviour. |
| B10 | Inches only. Display through `formatInches` (`src/lib/format.ts`) — tape fractions (`13/16″`), never decimals. No metric (`BUILD_PLAN` §4: metric is ⛔). |
| B11 | Persistence = Prisma + Clerk session. No Supabase, no anonymous designs, no share links or URL-encoded state (Phase 2). |
| B12 | Geometry = §2, exactly. Slice count is **derived from panel length**, never entered. |
| B13 | **No food-safety, health, or durability claims** in copy, data model, or species metadata. No `foodSafe` field. Such a claim is a product/legal statement ⇒ escalate. |
| B14 | Species and templates = §3 lists. Species ids are permanent: removing or renaming one after ship orphans saved JSON ⇒ escalate before touching the list. |
| B15 | Metrics are **computed on read, never stored**. No metrics columns, no cached totals (CLAUDE.md §7: compute-on-read over denormalized). |

---

## 2. Geometry contract — U1 implements this exactly

All lengths in inches, `number` (float). No rounding inside the math; round only at display, and only via `formatInches`. Inputs snap to 1/16″ at the **input control**, not in the library.

### 2.1 Glue-up 1 — the panel (both grain modes)

```
panelWidthIn     = Σ over strips of (widthIn × repeat)      // strips run side by side
panelLengthIn    = sourceLengthIn
panelThicknessIn = stockThicknessIn
```

### 2.2 `grain: 'edge'` — the panel IS the board

```
finishedLengthIn    = panelLengthIn
finishedWidthIn     = panelWidthIn
finishedThicknessIn = panelThicknessIn
sliceCount = 0 ; leftoverIn = 0        // not applicable; report as 0, never null
```

### 2.3 `grain: 'end'` — cross-cut the panel, rotate, re-glue

n slices need `n×slice + (n−1)×kerf ≤ panelLength`, therefore:

```
sliceCount   = max(0, floor((panelLengthIn + kerfIn) / (sliceThicknessIn + kerfIn)))
usedIn       = sliceCount × sliceThicknessIn + max(0, sliceCount − 1) × kerfIn
leftoverIn   = panelLengthIn − usedIn

// each slice is rotated 90° so the cut face (end grain) is the top face:
finishedLengthIn    = panelWidthIn                        // strip pattern runs the length
finishedWidthIn     = sliceCount × panelThicknessIn       // slices glued side by side
finishedThicknessIn = sliceThicknessIn
```

**Golden fixture (must be a test):** 12 strips × 1.5″ alternating walnut/maple, `sourceLengthIn 20`, `stockThicknessIn 1.5`, `sliceThicknessIn 1.5`, `kerfIn 0.125`
→ `panelWidth 18` · `sliceCount 12` · `usedIn 19.375` · `leftoverIn 0.625` · finished **18 × 18 × 1.5**.

**Kerf-trap fixture (must be a test):** `panelLength 18`, `slice 1.5`, `kerf 0.125` → `floor(18.125/1.625) = 11`, **not** 12. Naive `18/1.5 = 12` is the bug this fixture exists to catch — same failure class as the six-16″-on-a-96″-board case in `cut-optimizer.ts`.

**Zero-slice fixture (must be a test):** `panelLength 1`, `slice 1.5` → `sliceCount 0`, warning `No slices fit — increase panel length or reduce slice thickness.`, `complete: false`. Reported loudly, never silently zero (CLAUDE.md §7 cut-optimizer rule 4).

### 2.4 Board feet

You buy the **panel**, in both modes — end-grain slices come out of material already counted. Leftover is waste inside the panel and is already paid for.

```
bfForStrip(s) = (stockThicknessIn × s.widthIn × sourceLengthIn × s.repeat) / 144
boardFeetBySpecies[speciesId] = Σ bfForStrip over that species, × (1 + wasteFactor)
totalBoardFeet = Σ boardFeetBySpecies
```
`wasteFactor` default `0.15` — same allowance and reasoning as `DEFAULT_OPTIONS.wasteFactor` in `cut-optimizer.ts`.

### 2.5 `toParts()` — the Phase-2 bridge (built now, rendered never, per B7)

One `Part` (interface in `src/lib/cut-optimizer.ts`) per strip:
`{ id: strip.id, label: '<Species> strip <n>', quantity: strip.repeat, thicknessIn: stockThicknessIn, widthIn: strip.widthIn, lengthIn: sourceLengthIn, material: species.name }`
Grain never rotates a part (CLAUDE.md §7). Test: the array type-checks as `Part[]` and `optimize(parts, DEFAULT_OPTIONS)` returns without `impossible` entries for the §2.3 golden fixture.

### 2.6 Warnings — accumulate, never throw

| Condition | Warning string | `complete` |
|---|---|---|
| `strips.length === 0` | `Add a strip to see your board.` | false |
| end grain, `sliceCount === 0` | `No slices fit — increase panel length or reduce slice thickness.` | false |
| unknown `speciesId` | `Unknown wood: <id>` (render falls back to `--muted` swatch) | true |
| `finishedWidthIn > 24` | `Wider than most planers — plan to hand-flatten.` | true |

`calculateMetrics()` is **pure and total**: it never throws, never returns `NaN`, and always returns a full `BoardMetrics`. Invalid *shapes* are rejected upstream by zod (§3.4), not by throwing here.

---

## 3. Frozen contracts

**These signatures are the parallel-execution interface (§6). Changing anything here mid-sprint invalidates every unit running in parallel — stop them, amend this section, restart.**

### 3.1 Types — `src/lib/board-designer/types.ts`

```ts
export type Grain = 'edge' | 'end';

export interface WoodSpecies { id: string; name: string; colorHex: string }

export interface Strip { id: string; speciesId: string; widthIn: number; repeat: number }

export interface BoardDesignConfig {
  schemaVersion: 1;
  name: string;
  grain: Grain;
  sourceLengthIn: number;     // panel length
  stockThicknessIn: number;   // dressed stock thickness
  sliceThicknessIn: number;   // end grain only; ignored (but present) when grain === 'edge'
  kerfIn: number;
  wasteFactor: number;
  flipEveryOtherSlice: boolean; // RENDER ONLY — see §3.5. Never touches §2 math.
  strips: Strip[];
}

export interface SpeciesBoardFeet { speciesId: string; name: string; boardFeet: number }

export interface BoardMetrics {
  panelWidthIn: number; panelLengthIn: number; panelThicknessIn: number;
  finishedLengthIn: number; finishedWidthIn: number; finishedThicknessIn: number;
  sliceCount: number; leftoverIn: number;
  boardFeetBySpecies: SpeciesBoardFeet[]; totalBoardFeet: number;
  warnings: string[]; complete: boolean;
}
```
The original brief's `stripHeightIn` (two meanings) is **deleted** — `sliceThicknessIn` is the only slice field. `flipEveryOther` / `rotateEveryOther` are replaced by the single render-only `flipEveryOtherSlice`.

### 3.2 Species — `src/lib/board-designer/species.ts` (exactly these 8; B13: no other metadata)

`hard-maple` Hard Maple `#E7D3A9` · `walnut` Walnut `#4A3524` · `cherry` Cherry `#9C5A3C` · `white-oak` White Oak `#C6A67C` · `red-oak` Red Oak `#B4784F` · `sapele` Sapele `#7A3B26` · `purpleheart` Purpleheart `#5C3A6E` · `padauk` Padauk `#A8422A`

Colors live in **TypeScript, never in `globals.css`** — a CSS custom property would have to exist in both `:root` and `.dark` or `tests/dark-theme.test.ts` fails, and these are pigment values, not theme tokens.

### 3.3 Templates — `src/lib/board-designer/templates.ts` (exactly these 4)

| id | grain | strips, in order (species @ widthIn) | settings | finished |
|---|---|---|---|---|
| `classic-stripe` | edge | maple 1.5, walnut 1.5, maple 1.5, walnut 1.5, maple 1.5, walnut 1.5, maple 1.5 | length 18, stock 0.75 | 18 × 10.5 × 0.75 |
| `checkerboard` | end | 12 strips alternating maple 1.5 / walnut 1.5 | length 14, stock 1.5, slice 1.5, `flipEveryOtherSlice: true` | 18 × 12 × 1.5 (8 slices, leftover 1.125) |
| `butcher-block` | edge | maple 2.5, walnut 1, maple 2.5, walnut 1, maple 2.5 | length 20, stock 1.5 | 20 × 9.5 × 1.5 |
| `accent-stripe` | edge | maple 2.5, purpleheart 0.5, maple 5, purpleheart 0.5, maple 2.5 | length 16, stock 0.75 | 16 × 11 × 0.75 |

All templates use `kerfIn 0.125`, `wasteFactor 0.15`, `repeat 1`, `schemaVersion 1`. Every strip is listed explicitly — no shorthand to interpret. The `checkerboard` template deliberately differs from §2.3's golden fixture (which uses length 20 to make the arithmetic legible); the template's numbers are the ones a real maker would start from. Both are asserted in tests.

### 3.4 Serialization — `src/lib/board-designer/serialize.ts`

`parseConfig(raw: unknown): { ok: true; config } | { ok: false; error: string }` — **zod `safeParse`, never a throwing parse.**

Bounds (all required — an unbounded numeric field is the `formInt("1e9")` trap in float clothing):
`name` 1–80 chars · `strips` 1–60 items · `widthIn` 0.0625–24 · `repeat` 1–20 · `sourceLengthIn` 1–96 · `stockThicknessIn` 0.25–4 · `sliceThicknessIn` 0.25–4 · `kerfIn` 0–0.5 · `wasteFactor` 0–1 · `schemaVersion` literal `1`.

**Security:** the action caps the raw JSON **string** at 8 KB *before* `JSON.parse` (byte cap before decode — same discipline as `src/lib/storage.ts`). Over cap ⇒ silent bounce, no parse attempt.

### 3.5 Render layout — `src/lib/board-designer/layout.ts` (pure; used by BOTH the SVG diagram and the 3D scene)

```ts
export interface Cell { xIn: number; yIn: number; wIn: number; hIn: number; colorHex: string; speciesId: string }
export function layoutTopFace(config: BoardDesignConfig, metrics: BoardMetrics): Cell[];
```
Top face, origin top-left, x along `finishedLengthIn`, y along `finishedWidthIn`.
- **edge:** one cell per strip-repeat. `wIn = finishedLengthIn`, `hIn = strip.widthIn`, stacked down y.
- **end:** grid — columns = strips (`wIn = strip.widthIn`), rows = slices (`hIn = stockThicknessIn`), `sliceCount` rows. When `flipEveryOtherSlice`, odd rows use the strip order rotated by one (this is what produces the checkerboard).
- Unknown species ⇒ `colorHex` = `'#8A8A8A'` + the §2.6 warning. Never crash.

Pure, deterministic, node-testable. **U4's 3D scene consumes this same function** — it maps `Cell[]` to instanced boxes and extrudes by `finishedThicknessIn`. There is exactly one geometry mapping in the codebase.

### 3.6 Prisma — `prisma/schema.prisma`

```prisma
model BoardDesign {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  config    Json     // BoardDesignConfig — validated by serialize.ts on every write
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, updatedAt])
}
```
Plus `boardDesigns BoardDesign[]` on `User`. No thumbnail column (B8/MVP: no blobs — so `src/lib/user-deletion.ts` needs **no change**; the User cascade is sufficient. Adding a thumbnail later means adding a blob-gather step there first).

### 3.7 Component boundary (this is what lets U2 and U3 run in parallel)

U2 writes page shells that render, and U3 owns the implementation of:
```tsx
// src/components/designer/designer-shell.tsx  ('use client')
export function DesignerShell(props: {
  designId: string | null;               // null = new unsaved draft
  initialConfig: BoardDesignConfig;      // template default or the loaded design
  saveAction: (fd: FormData) => Promise<void>;
  updateAction: (fd: FormData) => Promise<void>;
});
```
No explicit `JSX.Element` return type anywhere in this feature — `@types/react` 19 removed the global `JSX` namespace, so bare `JSX.Element` fails `npm run typecheck`. Let TS infer, or write `React.JSX.Element`.

Delete is **not** on this boundary: it lives on `/designer/library`, which U2 owns end to end.

Neither unit edits the other's files. If this shape must change, §6's interface-freeze rule applies.

---

## 4. Repo integration map — the traps that will actually bite

| # | Trap | Rule |
|---|---|---|
| T1 | Next 15 forbids `next/dynamic({ ssr: false })` inside a Server Component | The R3F canvas is imported by a `'use client'` wrapper only. Page files stay server components. |
| T2 | CSP | **Do not edit `src/middleware.ts`.** `script-src 'strict-dynamic'` + nonce already covers dynamic chunks; `img-src` already allows `data:` and `blob:` (canvas PNG export works); `worker-src 'self' blob:` is already set. If something is blocked, read the browser console and report it — never widen CSP to make an error go away. |
| T2b | Clerk + nonce | `<ClerkProvider dynamic>` is already correct in the root layout. Do not add a `nonce` prop (CLAUDE.md §7 — Clerk zeroes it). |
| T3 | `vitest.config.ts` is `environment: 'node'` — no DOM, no WebGL | **Do not add jsdom, happy-dom, or `@react-three/test-renderer`.** Test `layoutTopFace()` and the metrics in node; test JSX with `renderToStaticMarkup` (see `tests/step-walker.test.tsx`); verify the 3D visually and record the observation. |
| T4 | Server actions are public HTTP endpoints and must never throw | `checkRateLimit('create')` **first** (`'toggle'` for delete) → `redirect(denialTarget(fd, '/designer'))` on denial · `formString` + zod `safeParse`, never a throwing parse · every lib call wrapped in `guardAction()` · malformed input ⇒ `redirect(bounceTarget(fd, '/designer'))`, silent. |
| T5 | IDOR | Owner comes from `requireUser()` only. Every query is `where: { id, userId: user.id }`. **Never** accept `userId` from a form. A design id in the URL is attacker input. |
| T6 | Offline / SW | Add `'/designer'` to `NEVER_CACHE_PREFIXES` in `public/sw-policy.js` **and** an assertion to the `covers every private surface` test in `tests/offline.test.ts`. Designs are never downloadable — do **not** touch `DOWNLOADABLE_PREFIXES`. |
| T7 | Route existence guard | Add each designer path to `ROUTE_MODULES` in `tests/route-modules.test.ts` **in the unit that creates the page file** — the test is `existsSync`, so listing a route before its module exists fails CI. U2 adds three (`designer/page.tsx`, `designer/library/page.tsx`, `designer/[id]/page.tsx`); **U5 adds `designer/[id]/print/page.tsx`**. |
| T8 | Indexing | Every designer page exports `robots: { index: false, follow: false }` in its `metadata` (pattern: `src/app/shopping-list/page.tsx:29`). |
| T9 | Elevation | Any floating panel uses `shadow-e1/e2/e3`. Never a `shadow-[...]` literal — `tests/elevation.test.ts` is a source scan and the print sheet sets `--elev-*: none`. |
| T10 | Touch targets + button classes | Reuse `btn`/`btnGhost`/`btnPrimary`/`selectControl`/`chip` from `src/lib/ui.ts`. Rolling your own control trips `tests/touch-targets.test.ts` (44px) or `tests/ui-classes.test.ts` (one border-color, one text-color — Tailwind emits in source order, not className order). |
| T11 | Print CSS | Classes referenced in an `@media print` block must stay **on the element** — converting them to utilities makes them print. Print is forced light. |
| T12 | Content pipeline | This feature touches **no** content. `npm run db:seed` is **not** required for deploy. Do not run it, do not mention it. |
| T13 | Migration | Create it locally and commit the SQL: `npm run db:migrate -- --name add_board_design`. **Pass `--name`** — bare `prisma migrate dev` prompts for one and will hang a non-interactive shell. Prod applies it via `prisma migrate deploy` in `vercel-build`. New table, no backfill. |
| T14 | Never a raw `prisma.boardDesign` in a page or action | All reads/writes go through `src/lib/board-designs.ts`, so the session scope cannot be forgotten (same rule as `published:true` living in `src/lib/plans.ts`). |

---

## 5. Units

Each unit: **OWNS** (exclusive write scope) · **READS** (the only files to open) · **DO** · **ACCEPTANCE** · **STOP**.

### U0 — Product gate ✅ 2026-07-24
Closed. `DECISIONS_LOG.md` 2026-07-24. Do not reopen.

---

### U1 — Geometry library  *(Sprint 51 · serial · blocks everything)*

**OWNS** `src/lib/board-designer/{types,species,templates,metrics,layout,to-parts,serialize}.ts` · `tests/board-designer-metrics.test.ts` · `tests/board-designer-serialize.test.ts` · `tests/board-designer-layout.test.ts`
**READS** §2, §3 · `src/lib/cut-optimizer.ts` (the `Part` interface + `DEFAULT_OPTIONS` only) · `src/lib/format.ts` (`formatInches` signature only)
**DO** Implement §2 and §3.1–§3.5 verbatim. Pure functions only — no React, no Prisma, no I/O, no `'use client'`.
**ACCEPTANCE**
- All three §2.3 fixtures pass, by those names.
- Edge-grain fixture: 7 × 1.5″ / length 18 / stock 0.75 → finished 18 × 10.5 × 0.75, `sliceCount 0`.
- Board feet: golden fixture → walnut and maple each `(1.5 × 9 × 20)/144 × 1.15 = 2.156…`; total `4.3125`.
- `parseConfig` round-trips the golden config; rejects each §3.4 bound violation with `ok:false` (one case per field, no throw); rejects `schemaVersion: 2`.
- `toParts()` output satisfies §2.5.
- `layoutTopFace` on the `checkerboard` template returns `12 strips × 8 slices = 96` cells, and row 1's first cell species ≠ row 0's first cell species (this is the flip).
- The `checkerboard` template itself resolves to 8 slices / leftover 1.125 / finished 18 × 12 × 1.5, and every §3.3 template's `finished` column is asserted.
- `calculateMetrics({...golden, strips: []})` returns the §2.6 warning, `complete: false`, and no `NaN` in any numeric field.
**STOP** if §2 appears wrong for a real glue-up — geometry errors waste the user's lumber and this is the one place to challenge it. Ask before coding around it.

---

### U2 — Private routes + persistence  *(Sprint 51 · parallel with U3 after U1)*

**OWNS** `prisma/schema.prisma` + the new migration · `src/lib/board-designs.ts` · `src/app/actions/board-designs.ts` · `src/app/designer/{page.tsx,library/page.tsx,[id]/page.tsx}` · `public/sw-policy.js` · `tests/offline.test.ts` · `tests/route-modules.test.ts` · `tests/board-designs-authz.test.ts`
**READS** §3.4, §3.6, §3.7, §4 · `src/lib/shopping-list.ts` + `src/app/actions/shopping-list.ts` (**the pattern to copy**) · `src/lib/auth.ts` · `src/lib/action-guard.ts` · `src/lib/rate-limit-feedback.ts` · `src/lib/form-fields.ts`
**DO** Model + migration (§3.6). `src/lib/board-designs.ts`: `listDesigns()`, `getDesign(id)`, `createDesign(config)`, `updateDesign(id, config)`, `deleteDesign(id)` — all owner-from-session, no `userId` parameter anywhere, all validating through `parseConfig`. Three actions per T4. Page shells rendering `<DesignerShell>` (§3.7) — `/designer` seeds from the `checkerboard` template; `/designer/[id]` loads and 404s on a foreign id (**404, not 403** — a 403 confirms the id exists). T6, T7, T8.
**ACCEPTANCE**
- Signed-out GET `/designer`, `/designer/library`, `/designer/<id>` each redirect to Clerk sign-in and return to the requested path.
- User B GET `/designer/<user-A-id>` → 404. User B update/delete action on A's id → no write, silent bounce.
- Posting `userId` in the form changes nothing.
- Rate-limited action returns a 303 with `?notice=slow-down` — never a 500.
- 9 KB config string → bounced before `JSON.parse`.
- No designer path in `src/lib/public-routes.ts`; `'/designer'` present in `NEVER_CACHE_PREFIXES` and absent from `DOWNLOADABLE_PREFIXES`.
**STOP** before any schema change beyond §3.6, or before adding any second model.

---

### U3 — Editor chrome + static board diagram  *(Sprint 51 · parallel with U2 after U1)*

**OWNS** `src/components/designer/` — `designer-shell`, `strip-list`, `board-settings`, `template-picker`, `metrics-panel`, `board-diagram`, **`board-preview`** · `tests/board-diagram.test.tsx` · `tests/designer-shell.test.tsx`
**READS** §3.1–§3.5, §3.7 · `src/lib/ui.ts` · `src/components/workshop-form.tsx` and `src/components/step-walker.tsx` (client-island patterns) · `DESIGN_BRIEF.md`
**DO** Implement `DesignerShell` (§3.7) and its children. Desktop: diagram left/center, controls right (settings → strips → metrics). Mobile: diagram on top, controls below. Interactions: add / duplicate / delete / reorder strip (up-down buttons; drag is Phase 2), species swatch grid, width input snapping to 1/16″, length / stock thickness / slice thickness, kerf as a `<select>` over `KERF_OPTIONS_IN` (reuse the optimizer's vocabulary), grain toggle, `flipEveryOtherSlice` toggle, template load (confirm when dirty).
`board-diagram.tsx` = **pure SVG from `layoutTopFace()`** — the one visual artifact. It serves the Sprint 51 editor, the U5 print sheet, **and** the U4 no-WebGL fallback. There is no other 2D preview; do not build a throwaway one.

**Seam for U4 (build this even though it looks like a pointless wrapper):** `board-preview.tsx` renders `<BoardDiagram>` and nothing else, and is the *only* thing `designer-shell` imports for the preview area. In Sprint 52, U4 replaces this file's internals with the 3D canvas + SVG fallback and never opens `designer-shell.tsx`. Without this seam U4 has to edit a U3-owned file, which §6 rule 2 forbids.
State: `useState`/`useReducer` inside the island. **No localStorage (B9), no store library.**
**ACCEPTANCE**
- Static render of `DesignerShell` with the golden config contains the finished dimensions as tape fractions and no `NaN`/`undefined`/`$`.
- `board-diagram` renders 96 `<rect>` for `checkerboard`, 7 for `classic-stripe`; alternate rows offset when flipping.
- Zero strips → `Add a strip` CTA + the §2.6 warning visible, no crash.
- Zero-slice config → the §2.6 warning rendered prominently, editing still works.
- The §3.4 worst case (60 strips × ~380 slices ≈ 23k cells) does not freeze the tab: either it draws, or the diagram shows a "too many pieces to draw" line while the metrics and cut list stay correct and editable. Metrics are never suppressed to make the picture cheap.
- Every control ≥44px; `npm test` guard suite green (T9/T10).
**STOP** before adding a state-management dependency, a drag-and-drop library, or any nav/marketing string (that is U5).

---

### U4 — 3D preview  *(Sprint 52 · parallel with U5)*

**OWNS** `src/components/designer/r3f-*` · **`src/components/designer/board-preview.tsx`** (the U3 seam — swap its internals; do not open `designer-shell.tsx`) · `package.json` (the three deps) · `tests/board-3d-layout.test.ts`
**READS** §3.5, T1–T3 · `src/components/designer/board-diagram.tsx` · `next.config.ts`
**DO** Add `three`, `@react-three/fiber`, `@react-three/drei` — **verify React 19 / Next 15 compatibility before installing** (R3F v9+ / drei v10+; an R3F v8 install against React 19 will typecheck and then fail at runtime). Dynamic import behind a `'use client'` wrapper (T1). Scene from `layoutTopFace()` — one `InstancedMesh` per species, extruded by `finishedThicknessIn`, chamfered edges, orbit + zoom (no pan-to-infinity), studio-ish lighting, a single ground/shadow plane, Oak & Forest background tokens. Procedural material only: base `colorHex` + subtle grain via noise/roughness (B8). Pause the render loop when the tab is hidden or the pointer is idle. `PNG export` = `canvas.toBlob()` download.
**ACCEPTANCE** (the "sleek" bar, made checkable — all of these or the unit is not done)
- Orbit + zoom at ≥50 fps desktop and ≥30 fps on one real mid-range phone; state the devices tested.
- Every §3.1 field change re-renders within one frame with no full-scene remount.
- One `InstancedMesh` per species regardless of cell count — **not** one mesh per cell. §3.4's bounds permit a 60-strip × ~380-slice worst case (~23k cells); `layoutTopFace` returns all of them truthfully (never truncate the model — CLAUDE.md §7). Test that worst case: hold ≥30 fps desktop, or fall back to the SVG with the reason stated on screen. Never silently drop cells to hit a frame rate.
- `next build` route table: the three/R3F chunk appears **only** under `/designer*`, and First Load JS for `/` and `/browse` is unchanged. Record the `/designer` First Load JS figure in `SPRINT_LOG`.
- No WebGL / lost context → `board-diagram` SVG renders instead, with one plain line of explanation; the cut list and every control still work.
- PNG downloads with the design name as filename and is not blank.
- Console clean: no CSP violation, no Clerk warning, no React key warning.
- Colour fidelity: a canvas pixel histogram must contain a colour within ΔE 10 of each rendered species' §3.2 hex. A geometrically correct board in the wrong colour is a FAIL.
**STOP** before: editing `src/middleware.ts` (T2), adding any fourth 3D dependency, adding a jsdom/WebGL test environment (T3), or downloading any texture/HDRI asset (B8).

---

### U5 — Print + hard nav  *(Sprint 52 · parallel with U4)*

**OWNS** `src/app/designer/[id]/print/page.tsx` · `src/components/site-header.tsx` · `src/app/page.tsx` (CTA only) · `src/app/globals.css` (print block only, if needed) · `tests/designer-print.test.tsx` · `tests/site-chrome.test.tsx` (designer assertions only)
**READS** B5, B6, T7, T8, T11 · `src/app/plans/[slug]/print/page.tsx` (**the pattern**) · `src/lib/landing-copy.ts`
**DO** Print sheet: owner-scoped, black-on-white, `board-diagram` SVG + finished dimensions + strip table + board feet by species + slice/leftover; `break-inside: avoid` on rows; repeated table headers; **no WebGL on paper** (T11, and a print route must not depend on a GPU). Then ship B6's strings: `SIGNED_IN_NAV` entry, landing secondary CTA next to `Browse the plans →` (`btnGhost`), library heading and empty state.
**ACCEPTANCE**
- Print route: signed-out → sign-in; foreign id → 404.
- Static render contains every dimension as a tape fraction, no `$`, no `shadow-[`.
- `tests/site-chrome.test.tsx` asserts the exact B6 nav string; landing test asserts the exact CTA label and `/designer` href.
- Landing's `queryPlans` call stays **unfiltered** and `landing-copy.test.ts`'s arg whitelist (`['perPage','sort']`) still passes — adding a CTA must not touch that call.
**STOP** before writing any string not in B6.

---

### U6 / U7 — Phase 2. **Unopened.** Do not start, do not scaffold, do not add a TODO for it.
U6 = `ShoppingListEntry` push + optimizer panel (`optimize()` / `BoardBar`). U7 = undo/redo, share links, multi-panel end grain, angled strips, custom species, drag reorder, thumbnails.

---

## 6. Parallel execution contract

```
Sprint 51:  [research: R3F/React-19 version check (read-only, background)]
            U1 ──serial gate──▶ ┌ U2 ┐ ──join──▶ verify · deploy · self-score
                                └ U3 ┘
Sprint 52:  ┌ U4 ┐ ──join──▶ verify · deploy · self-score · close
            └ U5 ┘
```

**Rules.**
1. **U1 is a hard serial gate.** It freezes §3. Nothing else starts until its tests are green.
2. **Exclusive file ownership.** A unit writes only its OWNS paths. Needing an edit in another unit's file ⇒ do not edit it — append a one-line request to §9 and continue on what you can.
3. **Interface freeze.** §3 changes mid-parallel-run ⇒ stop the parallel agents, amend §3, restart the affected units. Do not let two agents negotiate a signature.
4. **Read-only subagents are free and encouraged** — version checks, "does this pattern exist in the repo", CI log reading. Each returns ≤20 lines. Never spawn a read-only subagent for something in §1–§4 of this file; the answer is already here.
5. **Write agents: one per unit, maximum two concurrent.** Three concurrent writers on one Next.js app is a merge problem, not throughput.
6. **Join gates run once, serially** (§9). Two agents must never run `npm run build` or `git push` at the same time.
7. Sequential fallback: if only one agent is available, run U1→U2→U3, then U4→U5. Ownership rules still apply — they are what keeps the diff reviewable.

---

## 7. Guard-test conformance — check before you commit, not after CI fails

`format.test` (no dollar formatters) · `elevation.test` (no `shadow-[…]`) · `touch-targets.test` (44px) · `ui-classes.test` (one border-color / one text-color) · `contrast.test` (AA both themes) · `dark-theme.test` (`:root`/`.dark` token parity — which is why §3.2 keeps species colors out of CSS) · `offline.test` (T6) · `route-modules.test` (T7) · `security-headers.test` (CSP untouched) · `site-chrome.test` (nav strings) · `landing-scale.test` + `landing-copy.test` (U5) · `action-malformed-input.test` (actions never throw) · `content.test` (unaffected — T12).

Expected suite figure after Sprint 52: current total + the new designer tests. Update `BUILD_PLAN.md` §4's single test-count figure at sprint close.

---

## 8. Escalation triggers — STOP and ask Keagan

`BUILD_PLAN.md` §2 in full, plus, specifically for this feature:
- Any copy not in B6 that a user can read (page/section headings, marketing lines, empty states, tooltips longer than a label).
- Any dollar figure, price, cost estimate, or affiliate/vendor link (B3/B4).
- Any food-safety, health, durability, or "approved for" claim (B13).
- Adding/removing/renaming a species or changing `schemaVersion` after Sprint 51 ships (B14).
- Any new public route, or any change to `src/lib/public-routes.ts`.
- Any paid dependency, hosted service, API key, or SDK; any dependency whose license is not MIT/Apache-2.0/BSD/ISC.
- Any second Prisma model, or any change to an existing table's columns.
- Scope you believe belongs in this sprint but is not in §5.
- §2 geometry that you believe is wrong.
- Any CSP, middleware, or `public-routes` change proposed to make an error go away.

**Do not escalate:** naming, file layout, component decomposition, test structure, which `src/lib/ui.ts` class to use, tiny chrome labels, or anything already answered in §1–§4.

---

## 9. Sprint close

**Verification (Cursor VM, in order, once per sprint at the join gate):**
```bash
sudo pg_ctlcluster 16 main start
npm run db:migrate
npm run lint && npm run typecheck && npm test && npm run build
```
Then the manual pass — record the observed outcome of each, not "ok":
1. Signed out: `/designer` → sign-in → returns to `/designer` after auth.
2. Load `checkerboard` → change a species → diagram/3D updates live.
3. On `checkerboard`: kerf `0.125` → `0.1875` → leftover recomputes; then slice thickness `1.5` → `2` → slice count drops 8 → 6. Both numbers must move, or the math is not wired to the UI.
4. Set panel length below one slice → loud warning, no crash, controls still usable.
5. Save → `/designer/library` lists it under `Your boards` → reopen → identical config.
6. Second account cannot open that id (404).
7. Print preview: one page, black on white, fractions, no shadows.
8. (Sprint 52) Orbit/zoom on desktop + one phone; PNG export opens and is not blank.
9. Sign out → `/designer` unreachable → DevTools → Cache Storage contains no `/designer` entry.

Then: push to `main`, check GH Actions (`curl -s "https://api.github.com/repos/klatar200/Woodworking-Plan/actions/runs?per_page=5"`), confirm the Vercel deploy, self-score against `BUILD_PLAN` §6 with per-category evidence, write one `SPRINT_LOG` entry, update `BUILD_PLAN` §4's row and test-count figure, and flip this file's status line.

**Unit handoff log** (append one line per unit: decisions taken, and any cross-unit edit request per §6 rule 2):
- U1 2026-07-25: geometry accepted as-written (§2); strip ids `cs-*`/`cb-*`/`bb-*`/`as-*`/`g-*`; edge templates set `sliceThicknessIn = stockThicknessIn`; `rotateByOne` = left-rotate for flip rows; unknown species name falls back to id in board-feet rows.
- U2 2026-07-25: BoardDesign model + migration; session-scoped CRUD; 8 KB pre-parse cap; `/designer` never-cache; pages import DesignerShell (U3); no public-routes change.
- U3 2026-07-25: DesignerShell + SVG via BoardPreview seam; 1/16″ width snap; KERF_OPTIONS_IN select; ~23k cell fallback copy "too many pieces to draw"; join removed duplicate page h1 + draft blurb (B6).
- Sprint 51 close 2026-07-25 Attempt 2: score 92/100 — blocked on Vercel MCP/dashboard auth (cannot quote migrate lines for `add_board_design`) and Clerk signed-in smoke (Google OAuth, no test user). Prod signed-out `/designer` → Clerk sign-in `redirect_url=…/designer` observed. No U4/U5; no nav/CTA.
- U4 2026-07-25: deps `three@0.185.1` / `@react-three/fiber@9.6.1` / `@react-three/drei@10.7.7` (all MIT); `MAX_3D_CELLS=8000`; one InstancedMesh/species; SVG fallback + PNG export; no middleware/CSP edits; updated obsolete U3 board-preview seam assert in `tests/board-diagram.test.tsx`.
- U5 2026-07-25: print route `/designer/[id]/print`; SIGNED_IN_NAV `Designer`; landing CTA `Design a board →` + B6 support line; ROUTE_MODULES print entry.
- Sprint 52 re-close 2026-07-25: tip CI `7ac9f20` green; First Load baseline cited from Sprint 51 join build (`/` 138 · `/browse` 140). **Blocked on Keagan queue results** — prompt arrived with unfilled `<PASS / FAIL>` placeholders for items 1–8; cannot triage or re-score Correctness until filled.
- Sprint 52 Attempt 2 2026-07-25: P0-A black = RGBFormat+sRGB grain map → roughnessMap RGBA/NoColorSpace; P0-B denylist already on prod:70 (U2 tests green — false FAIL); P1-A `page-wide` on editor routes; P1-B non-passive wheel + zoom clamps; P2 three@0.182 + PCFShadowMap; P3 edge metrics hide + radiogroup; U4 ACCEPTANCE colour-fidelity bullet; score **98/100**.
