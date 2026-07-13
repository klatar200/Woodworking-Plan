# Launch Economics — decisions due before Phase 2

Phase 1 (MVP) is complete. This document exists because four decisions have come
due **together**, and deciding any one of them in isolation just moves the problem.

Every figure below was verified against current vendor pricing on **2026-07-13**,
not recalled. Vendor terms have already caught this project out twice (Vercel's
commercial-use clause; Clerk's free tier changing), so nothing here is from memory.

---

## 1. Hosting — the binding constraint

**Vercel's Hobby tier prohibits commercial use**, explicitly including affiliate
links, advertisements, and taking payment from visitors. This was logged as a
binding gate in `DECISIONS_LOG.md` on 2026-07-12 and it is now the thing standing
between us and Phase 2: the shopping-list generator has affiliate links in it.

### Options

| Option | Cost | Notes |
|---|---|---|
| **Vercel Pro** ⭐ | **$20/user/mo**, includes a **$20 usage credit**, 1 TB bandwidth, 10M edge requests | Commercial use permitted. Zero migration. The $20 credit means the *effective* infra cost at launch traffic is ≈ the seat fee alone. |
| Cloudflare Workers / Pages | $0–5/mo | Free tier permits commercial use. But Next.js on Workers is a real migration with real edge cases, and we'd be re-testing the whole app to save ~$20/mo. |
| Stay on Hobby, drop affiliate links | $0 | Legal, but abandons what `BUSINESS_PLAN.md` §8 itself calls one of the two biggest profit levers ("affiliate attach rate, since it's close to pure margin"). |

**Recommendation: Vercel Pro, $20/mo.** It is the cheapest *total* cost once you
price the migration, and it unblocks everything else. Against `BUSINESS_PLAN.md`
§8's "Early stage: $150/mo hosting" assumption, $20 is a rounding error.

---

## 2. Payment processor (decision #6, deferred since Sprint 0)

**Stripe** remains the recommendation — it is the default for subscription billing
and handles the tiering in §7 natively.

### But the fee maths on a $6.99/mo tier is genuinely bad

Stripe's US rates: **2.9% + $0.30** per card charge, plus **0.7%** of volume for
Stripe Billing (the subscription layer).

| Plan | Price | Stripe fee | **Effective rate** |
|---|---|---|---|
| Plus **monthly** | $6.99 | ~$0.55 | **7.9%** 😬 |
| Plus **annual** | $59.00 | ~$2.42 | **4.1%** |
| Pro **monthly** | $14.99 | ~$0.84 | **5.6%** |
| Pro **annual** | $129.00 | ~$4.63 | **3.6%** |

The **$0.30 flat fee** is what does the damage — on a $6.99 charge it is 4.3% all
by itself. `BUSINESS_PLAN.md` §8 budgets "payment processing (~3%)". **At the
proposed monthly prices, the real number is closer to 6–8%.**

This is not a reason to reject Stripe (every processor charges a flat component).
It *is* a reason to look hard at the pricing model before committing to it.

**Three ways to fix it, and they compose:**
1. **Push annual hard.** Annual halves the effective fee rate *and* kills churn.
   Make the annual price the visually default choice.
2. **Raise the monthly floor.** A $9.99 Plus tier takes the effective fee from
   7.9% → 5.9% and costs you very few conversions at this price point.
3. **Offer ACH** for annual plans (0.8%, capped at $5) — meaningful on a $129 Pro
   annual.

---

## 3. Pricing model (`BUSINESS_PLAN.md` §7 — still an *unconfirmed recommendation*)

`DECISIONS_LOG.md` lists the entire monetization model under "Recommendations
Awaiting Explicit Confirmation". **The build agent has never treated it as
decided** — which is why Sprint 6 shipped saves and collections with *no limits*.

Before any billing work, this needs an explicit answer:
- Are the **tiers** right? (Free / Plus / Pro / Creator)
- Are the **prices** right, given the fee analysis above?
- Are the **Free-tier limits** right? (§7 proposes ~10 saves, 1 collection.)

Nothing in the codebase blocks any of these. The limits go in exactly two
functions (`savePlan`, `createCollection`) — that was designed in deliberately.

---

## 4. Branding / domain (decision #8 — open since Sprint 0)

Still open, and now blocking:
- The app is called **"Woodworking Plan"** — a working name, not a decision.
- The **PWA icons are placeholders**, not a logo.
- `robots: noindex` is still set sitewide, because we are not shipping unbranded
  content into search results.
- **HSTS `preload` was deliberately omitted** — preloading hard-codes a domain into
  browser binaries and is painful to reverse. That decision waits for a real domain.

A domain costs ~$12/yr. The name is a pure brand decision and is yours alone.

---

## 5. What launch actually costs

| Item | Monthly |
|---|---|
| Vercel Pro | **$20** (incl. $20 usage credit) |
| Neon Postgres | $0 (free tier, verified adequate) |
| Clerk | $0 (free to 50k users — raised from 10k in Feb 2026) |
| Upstash Redis (rate limiting) | $0 (free tier: 500K commands/mo) |
| Domain | ~$1 (~$12/yr) |
| Stripe | Usage-based only (see above) |
| **Fixed total** | **≈ $21/mo** |

`BUSINESS_PLAN.md` §8 assumed **$150/mo** of infra at the early stage. The actual
number is **~$21**. That is a real finding: the burn model in the business plan is
materially conservative on infra, which buys room elsewhere.

---

## 6. Open launch blockers (engineering, but two need a vendor decision)

| Blocker | Needs |
|---|---|
| **No rate limiting on server actions.** Anyone can hammer `likePlanAction`. An in-memory limiter is *theatre* on serverless — each instance has its own memory. | **Upstash Redis (free tier)** — a new vendor, so it is Keagan's call. |
| **Clerk deletion webhook.** A user deleted in Clerk leaves their `User` row and cached email in our database — a data-retention problem the moment there are real users. | Nothing. Build agent can do it. |
| **`sw.js` duplicates the caching rules** in `offline.ts`. Change one, change both, or the tests pass while the shipped worker misbehaves. | Nothing. |
| **Placeholder PWA icons + `noindex`.** | Decision #8. |

---

## Recommended sequence

1. **Confirm hosting** (Vercel Pro) → unblocks everything.
2. **Confirm pricing** (with the fee analysis in hand) → unblocks billing.
3. **Confirm branding/domain** → unblocks SEO, icons, HSTS preload.
4. **Close the launch blockers** (rate limiting, Clerk webhook, sw.js dedup).
5. **Then** re-plan Phase 2 against a business plan that reflects all of the above —
   which is exactly what `BUILD_PLAN.md` §4 requires.
