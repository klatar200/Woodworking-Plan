# Woodworking Plan — Business Plan & Product Description

## 1. Executive Summary

**Woodworking Plan** (working name) is a subscription-based web and mobile
application that acts as a searchable repository of woodworking plans and
builds — from simple cutting boards to end-grain cutting boards, bed
frames, sheds, and beyond. Users log in, browse or search a large catalog
of vetted plans, save the ones they like into personal categorized
collections, and like/favorite builds to help the community and the
recommendation engine surface the best content.

The product sits at the intersection of two proven markets: hobbyist
"how-to" content platforms (e.g., Instructables, YouTube woodworking
channels) and structured plan marketplaces (e.g., Ana White, Etsy PDF plan
sellers). Neither offers the combination of **structured, filterable
metadata** (tools, materials, time, cost tier) **and** a personal
save/organize/like experience purpose-built for woodworkers.

## 2. Problem Statement

Woodworkers today piece together plans from scattered blogs, YouTube
videos, PDFs, and forum posts. There is no single place to:

- Search plans by the criteria that actually matter to a maker (skill
  level, tools on hand, budget, time available).
- See an upfront, standardized cost/time/difficulty breakdown before
  committing to a build.
- Save and organize plans into personal project queues ("Gifts,"
  "Shop Upgrades," "Outdoor Furniture").
- Discover quality builds via community signals (likes) rather than SEO
  or ad spend.

## 3. Target Audience

| Segment | Description | Why they'd pay |
|---|---|---|
| **Hobbyist woodworkers (primary)** | DIYers with a garage/basement shop, own basic-to-intermediate tools, build on weekends | Want curated, reliable plans instead of hunting YouTube/Pinterest |
| **Beginner woodworkers** | New to the craft, own a starter tool kit | Need difficulty filtering and clear tool/material lists to avoid overreaching |
| **Serious/semi-pro makers & small shop owners** | Build for sale (Etsy, craft fairs, custom orders) | Need accurate cost breakdowns for pricing their own work, and time estimates for job quoting |
| **Makerspaces & woodworking clubs** | Community shops with shared tool inventories | Bulk/team accounts to source approved plans for members and classes |
| **Gift/one-off builders** | Occasional builders looking for a specific project (e.g., a bed frame for a new house) | Low-commitment single-project or trial access |

**Demographics (informed estimate):** Primarily 30–65 years old, skews
male but with a fast-growing female and younger (25–35) DIY audience,
household income $60k+, homeowners, existing investment in tools
($500–$5,000+), active in DIY/home-improvement content already (Reddit
r/woodworking, YouTube, Instagram).

## 4. Core Features (MVP / Launch Requirements)

These map directly to the requirements you specified:

1. **Account & Auth** — sign up/login (email + OAuth), user profile.
2. **Plan Repository** — large catalog of builds/plans (cutting boards,
   end-grain cutting boards, bed frames, sheds, shelving, outdoor
   furniture, etc.).
3. **Save Plans** — bookmark any plan to your account.
4. **Custom Categories** — group saved plans under user-defined category
   names (e.g., "Kitchen," "For the Cabin," "Beginner Projects").
5. **Keyword Search** — full-text search across plan titles, descriptions,
   tags, tools, and materials.
6. **Filter/Facet Search** — filter by:
   - Category (cutting boards, furniture, outdoor, storage, etc.)
   - Difficulty level (Beginner / Intermediate / Advanced, or 1–5 scale)
   - Cost tier ($ to $$$$$)
   - Estimated build time
   - Required tools (e.g., "only show plans I can build with tools I
     own")
7. **Liking** — like a build/plan; like counts drive a "Popular" /
   trending sort.
8. **Structured Plan Data** — every plan includes:
   - Tools required (list, with links/notes on essential vs. optional)
   - Materials required (species, hardware, finish, quantities)
   - Estimated time to complete (e.g., "6–8 hrs" or "2 weekends")
   - Cost breakdown by material tier ($ = cheap → $$$$$ = expensive),
     plus an itemized estimated material cost range
   - Step-by-step instructions, diagrams/cut lists, and photos
   - Skill/difficulty rating

## 5. Content Strategy (how the repository gets built)

A search/save/like app is only as good as its catalog. Recommended mix:

- **Launch seed content:** license or partner with established plan
  creators (Ana White–style bloggers, YouTube woodworkers) for a starting
  catalog of 300–500 high-quality plans, standardized into the app's
  metadata schema.
- **In-house content team:** 1–2 contractor woodworkers/writers producing
  new standardized plans monthly.
- **Community/creator submissions (post-launch):** allow vetted creators
  to submit plans, with a revenue-share or flat licensing fee — this is
  the biggest long-term lever for catalog growth and is where a "Pro
  creator" tier (see below) plugs in.
- **Moderation/QC:** every submitted plan goes through an editorial check
  to normalize tools/materials/time/cost fields before publishing, so
  search and filters remain trustworthy.

## 6. Monetization Model

Recommended: **Freemium subscription**, since the core save/search/like
loop needs a logged-in habit before people will pay.

| Tier | Price | What's included |
|---|---|---|
| **Free** | $0 | Browse & search full catalog, limited saves (e.g., 10 plans), liking, 1 category folder |
| **Plus** | $6.99/mo or $59/yr | Unlimited saves, unlimited categories, advanced filters (tool-based filtering, cost/time sort), offline/print-friendly plan view, ad-free |
| **Pro/Shop** | $14.99/mo or $129/yr | Everything in Plus + cut-list/material calculators, project cost estimator export (useful for makers who sell builds), early access to new plans, makerspace/team seats |
| **Creator (revenue share)** | Free to join | Vetted contributors publish plans and earn a share of subscription revenue attributable to engagement with their content, or a flat per-plan licensing fee |

Secondary revenue streams:
- **Affiliate commissions** on tools/materials linked in plans (Amazon
  Associates, Rockler, Woodcraft, Lee Valley affiliate programs) — high
  margin, low effort, and directly aligned with the "tools/materials
  required" data you already need to display.
- **Sponsored/featured plans** from tool brands (e.g., a featured "built
  with the XYZ table saw" plan).
- **Display ads** on the free tier only (kept minimal to protect UX).

## 7. Monthly Profit Estimation

These are **planning-level estimates**, not guarantees — actual results
depend heavily on marketing spend, conversion rates, and content quality.
Assumes a 12–18 month post-launch horizon once there's a real user base
(pre-launch and month 1–3 will run at a loss).

### Revenue assumptions at three growth stages

| Metric | Early (Month 3–6) | Growing (Month 12) | Established (Month 24) |
|---|---|---|---|
| Registered users | 5,000 | 40,000 | 150,000 |
| Free → Paid conversion | 3% | 5% | 7% |
| Paying subscribers | 150 | 2,000 | 10,500 |
| Blended avg. revenue/paying user (ARPU, mix of Plus/Pro) | $8/mo | $9/mo | $10/mo |
| **Subscription revenue/mo** | **$1,200** | **$18,000** | **$105,000** |
| Affiliate revenue/mo (est. $0.10–$0.25 per active free user) | $500 | $4,500 | $18,000 |
| Sponsored content/mo | $0 | $1,500 | $6,000 |
| **Total revenue/mo** | **~$1,700** | **~$24,000** | **~$129,000** |

### Cost assumptions

| Cost category | Early | Growing | Established |
|---|---|---|---|
| Hosting/infra (DB, storage, CDN, search) | $150 | $800 | $3,500 |
| Content (contractors, licensing, moderation) | $2,000 | $4,000 | $9,000 |
| Team (dev/design, part-time → full-time) | $6,000 | $14,000 | $35,000 |
| Marketing/acquisition | $1,000 | $6,000 | $20,000 |
| Payment processing (~3%) | $50 | $700 | $3,900 |
| Misc/tools/support | $300 | $700 | $2,000 |
| **Total costs/mo** | **~$9,500** | **~$26,200** | **~$73,400** |

### Net monthly profit (estimated)

| Stage | Revenue | Costs | Net |
|---|---|---|---|
| Early (M3–6) | $1,700 | $9,500 | **–$7,800/mo (pre-profit, funded burn)** |
| Growing (M12) | $24,000 | $26,200 | **≈ –$2,200/mo (near breakeven)** |
| Established (M24) | $129,000 | $73,400 | **≈ +$55,600/mo profit** |

**Takeaway:** This is a slow-build, content-and-trust business, not a
viral app. Expect 12–18 months of subsidized growth before breakeven, with
meaningful profit only once the catalog and user base both compound
(more saves/likes → better search relevance → higher conversion). The
biggest levers on profit are (a) affiliate attach rate, since it's
close to pure margin, and (b) creator-submitted content, which scales
the catalog without linearly scaling headcount cost.

## 8. Competitive Landscape

| Competitor | Strength | Gap this app fills |
|---|---|---|
| Ana White / blogs | Free, trusted, great plans | No unified search, no saved/liked collections, no standardized cost/tool/time metadata |
| Etsy / plan marketplaces | Wide variety, cheap | No repository/browse experience, quality varies wildly, no personalization |
| YouTube | Huge content volume, free | Not structured/searchable by difficulty/cost/tools, no save-to-library UX |
| Instructables | Structured how-tos, community | Not woodworking-specific, weak filtering by tools/cost/time |

**Differentiator:** structured, comparable metadata (tools/materials/time/
cost tier) across every single plan, purpose-built organization
(categories, saves, likes), and filtering that matches how woodworkers
actually decide what to build next ("what can I build this weekend with
what I own for under $50?").

## 9. Core Features vs. Future Roadmap

### Launch (MVP) — see Section 4 above

### Phase 2 (3–6 months post-launch)
- User reviews/ratings and build photos ("I made this")
- Personalized recommendations based on saved/liked plans and owned tools
- Shopping list generator (aggregate materials across multiple saved
  plans into one buyable list, with affiliate links)
- Print-friendly / offline PDF export of plans
- Mobile app (iOS/Android) companion to the web app

### Phase 3 (6–12 months post-launch)
- Creator marketplace: vetted third-party creators publish and monetize
  plans directly on the platform
- Cut-list optimizer / board-footage calculator tool
- Project cost estimator that factors in local lumber prices
- Makerspace/team accounts (shared libraries, seat-based billing)
- Skill-building learning paths ("Beginner → Intermediate joinery")

### Phase 4 (12+ months)
- AI-assisted plan customization (resize a plan to custom dimensions,
  substitute wood species and recalculate cost/materials)
- Community forums / build logs tied to specific plans
- Video content integration (step-by-step video alongside written plans)
- International expansion (metric units, regional lumber pricing/species)
- Tool-inventory-aware search ("show me only plans I can build with the
  tools I've told you I own")

## 10. Key Success Metrics (KPIs)

- **Catalog health:** number of plans, % with complete metadata
  (tools/materials/time/cost), average plan rating
- **Engagement:** saves per user, likes per plan, searches per session,
  category folders created per user
- **Monetization:** free→paid conversion rate, ARPU, affiliate
  click-through/attach rate, churn rate
- **Growth:** MAU, new signups/month, organic vs. paid acquisition split

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Thin/low-quality catalog at launch kills trust | Invest in seed content licensing before public launch; enforce metadata QC |
| Slow conversion (free users never pay) | Gate high-value actions (unlimited saves/categories) rather than content itself; keep search/browse free to build habit |
| Content/IP disputes with plan creators | Clear creator agreements, revenue share or licensing fees, attribution |
| Competing free content (YouTube/blogs) | Win on organization/search/filtering, not on being the only source |
| High CAC in a niche hobby market | Lean on affiliate/community partnerships (tool brands, woodworking YouTubers) instead of broad paid ads |
