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
