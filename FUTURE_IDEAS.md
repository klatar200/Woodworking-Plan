# Future Ideas — the parking lot

Things that are **deliberately not being built**, and the reason why.

This file exists so that "not now" does not quietly become "never, and nobody
remembers we considered it." Nothing here is scheduled. Nothing here is approved.
Moving an item out of this file and into `BUILD_PLAN.md` §4 is **Keagan's decision
alone**, and it should come with a reason that has changed.

**Rule for the build agent:** do not start anything on this list. If a sprint's work
seems to require one of these, that is a scope-creep signal — stop and say so.

---

## Parked 2026-07-13 (Keagan's call, at the start of Phase 3)

### Creator marketplace (third-party plan publishing + monetization)

**Was:** the headline item of Phase 3.

**Why parked:** *"This may be a later build if the idea catches popularity but not
before anyone has even joined the app."*

That is the right instinct, and it is worth writing down why: a marketplace is a
**two-sided** product. It needs creators *and* buyers, and it has neither. Building the
supply side for an audience of zero would be the single most expensive way to learn
nothing.

**Also blocked regardless:** monetization requires leaving Vercel Hobby (its terms
prohibit commercial use), plus a payment processor (decision #6) and a pricing model
(decision #7). All three come due together.

**What would have to change to revisit:** real users, and evidence that people want to
publish plans here rather than on Etsy or their own site.

---

### Native iOS / Android app

**Was:** Phase 3, "re-evaluate only if data shows push/discovery is a real growth
bottleneck."

**Why parked:** same reason, stated more plainly by Keagan — nobody has joined the app
yet. The original condition ("only if the data shows...") was already the correct gate;
parking it just makes the answer honest instead of theoretical. **There is no data,
therefore there is no case.**

The PWA is installable, works offline, and is on the home screen. That was the whole
argument for going PWA-first (`BUSINESS_PLAN.md` §5), and it still holds.

**What would have to change to revisit:** usage data showing that push notifications or
app-store discovery are actually limiting growth — not a hunch that they might.

---

### Project cost estimator using local lumber prices

**Was:** Phase 3.

**Why parked:** *"that would be way too much to maintain. Having an estimate is best."*

Correct, and the maintenance burden is the smaller half of the problem. The larger half:
there is **no free, perpetual, licensed source** for regional lumber pricing. It would
mean a paid data vendor (breaking the $0 rule), or scraping retailers (a licensing and
legal problem, and a fragile one — retailer HTML changes weekly and each break silently
prints a *wrong price* next to something someone is about to buy).

A hand-authored ballpark, clearly labelled as a ballpark, is more honest than a live
number that is confidently wrong.

**Superseded by:** the 2026-07-13 decision to show **cost tiers only** ($ / $$ / $$$)
and no dollar figures at all in the public UI. Live pricing would have nowhere to go.

---

## Previously considered, never approved

These predate Phase 3 and were listed in `CLAUDE.md` §5 as out of scope. Recorded here so
the list lives in one place:

- **Comments on plans** (distinct from reviews, which shipped in Sprint 10)
- **Tool substitution notes** ("no jointer? here's how")
- **Plan versioning** (revision history on a plan)
- **Owned-tools profile** — *deferred, not rejected.* It IS in `BUSINESS_PLAN.md` §10,
  and it needs a `UserTool` table plus a "my workshop" screen. See `DECISIONS_LOG.md`
  2026-07-13. This one is genuinely queued, not parked.
- **Convert to metric** - Maybe have a conversion option inside of the profile settings. 
  When toggled, it will change all of the quantities and measurements into metric measurements. 

---

## Parked 2026-07-19 (Keagan's call, from the QOL/UI planning pass)

Surfaced during the 2026-07-19 QOL/UI planning pass. None of these are UI polish — each is a
genuinely new product surface with its own scope, and none are in `BUSINESS_PLAN.md`.
Keagan confirmed appending all eight rather than building any of them now.

- **CNC plans.** A distinct plan *type* — different tool assumptions, and likely a
  different file format (toolpaths, not a cut list). Needs a taxonomy decision (new
  `Plan` variant vs. a wholly separate model) before it's a build task.
- **Woodworking jig plans.** Probably the smallest lift on this list if ever approved —
  likely just another `Category`, not new structure. Still not scheduled.
- **Edge-grain / end-grain cutting board designer.** An interactive tool (pick
  dimensions/species → generates a cut list), not content. Closer in scope to a second
  cut-list optimizer (Sprint 15) than a UI tweak.
- **Site map.** Blocked by the still-open branding/domain decision (`BUILD_PLAN.md`
  §4.2 #3) — `robots: noindex` is sitewide on purpose until that lands. A sitemap
  nothing can index yet has no job to do.
- **SEO optimization.** Same blocker as the site map.
- **Custom community-driven plans.** Already parked once, explicitly
  (`BUILD_PLAN.md` §4.2, 2026-07-15): "who-owns-a-submitted-plan is a licensing
  decision that shouldn't be rushed." Restating it here so it's tracked in one place too.
- **Lumber board-foot calculator (standalone tool).** Distinct from the QOL-B
  per-material board-foot tooltip (a small clarifying label on an existing page) — a
  standalone calculator is its own feature surface with its own UI.
- **Repository of known woodworking tools** (by skill level: beginner/intermediate/
  expert). A content library project in the same shape as the plan catalog itself, not
  a UI fix — real scope is "a second content type," not a sprint.

**What would have to change to revisit any of these:** Keagan adding it to
`BUSINESS_PLAN.md` himself, same rule as every other item in this file.

---

## Parked 2026-07-24 (docs cleanup — capturing removed briefs)

- **Catalog audit & enrichment pass.** A full audit/improve sweep over `content/plans/*.json` (originally spec'd for the ana-white catalog; now applies to the Kreg catalog). The one concrete live piece is re-publishing the **489 hidden Kreg plans** once a 2nd cut-list parse fills their empty `cutList` — already tracked in `BUILD_PLAN.md` open follow-ups + `CLAUDE.md` §6. The detailed briefs (`PLAN_AUDIT_BRIEF.md`, `step-detail-rewrite-sample.md`) were removed in the 2026-07-24 docs cleanup; recover from git history if this work is scheduled.
- **Step-detail depth rewrite.** Rewrite step prose catalog-wide to "buildable by reading alone" depth (the runtime `src/lib/step-format.ts` formatter already improves presentation; this is a content pass, not code). Parked; calibration sample removed, in git history.
