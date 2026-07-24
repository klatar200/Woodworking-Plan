<!-- BUSINESS_PLAN.md — agent-optimized. Product source of truth (what to build). Market/financials/competitive analysis dropped as non-agent context; recover from git if needed. -->

# BUSINESS_PLAN.md — Notch

## Product
Subscription-capable, mobile-first PWA: a searchable repository of woodworking plans/builds (cutting boards, end-grain boards, bed frames, sheds, shelving, outdoor furniture, …). Users log in, browse/search a large vetted catalog, save plans into custom named categories, and like builds. Differentiator = structured, comparable per-plan metadata (tools, materials, time, cost tier) + a personal save/organize/like experience.

## MVP / launch features (the spec)
1. Account & auth (email + OAuth), user profile.
2. Plan repository — large catalog.
3. Save plans (bookmark).
4. Custom categories (user-named groups of saved plans).
5. Keyword search across title/description/tags/tools/materials.
6. Filter/facet: category · difficulty (1–5) · cost tier ($–$$$$$) · build time · required tools ("only plans I can build with tools I own").
7. Liking → drives Popular/Trending sort.
8. Structured plan data per plan: tools (essential vs optional), materials (species/hardware/finish/quantities), estimated time, cost by tier ($–$$$$$) + itemized estimated range, step-by-step instructions/cut lists/photos, difficulty rating.

## Platform (decided)
Mobile-first responsive PWA, NOT app-store-first. Installable to home screen; offline via service-worker caching (saved plans viewable with no signal = the key shop/outdoor/hardware-store capability); one codebase; no app-store fees/review. Trade-off accepted: weaker push + discovery. Revisit native only if data shows push/discovery gates growth (currently parked, FUTURE_IDEAS).

## Content strategy
Seed via licensing/partnership with established creators; in-house standardization; editorial QC to normalize tools/materials/time/cost so filters stay trustworthy. Community/creator submissions = post-launch, parked (FUTURE_IDEAS).

## 7. Monetization — ⚠️ ORIGINAL, NOT RE-CONFIRMED, NOT AN APPROVED BUILD TARGET
This section is from the original build, not revisited since; may or may not change. **No billing, paid tiers, affiliate links, or ads are approved.** Current launch economics = $0 / no monetization on Vercel Hobby (DECISIONS_LOG). Do NOT build any monetization/tier-gating/pricing/limits without a fresh Keagan decision. Illustrative only: freemium (Free w/ limited saves + 1 folder; Plus ~$6.99/mo unlimited + advanced filters + offline/print + ad-free; Pro ~$14.99/mo + calculators/estimator export + team seats; Creator revenue-share), plus affiliate/sponsored/free-tier ads. None of this is a spec.

## Roadmap (product-level; authoritative status in BUILD_PLAN §4)
Phase 2: reviews/build photos, personalized recs, shopping-list generator, print/offline export, expanded offline. Phase 3: creator marketplace, cut-list optimizer, cost estimator, makerspace/team accounts, learning paths, native re-eval. Phase 4: AI plan customization, forums/build logs, video, international/metric, tool-inventory-aware search. (Several deferred/cut — see FUTURE_IDEAS + BUILD_PLAN §4.)

**Cutting Board Designer (added 2026-07-24, Keagan):** first-party interactive edge/end-grain board designer — sign-in required; hard nav presence; modern real-time **3D** preview as the product differentiator (lightweight shell allowed early); save/export/print in first ship; shopping-list push in a later phase. Not a freemium clone; no PRO paywall / dollar lumber UI. Status → BUILD_PLAN §4 Sprint 47+.
