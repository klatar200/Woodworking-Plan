<!-- FUTURE_IDEAS.md — agent-optimized. The do-NOT-build list. Rule: do not start anything here; if a sprint seems to need one, that's a scope-creep signal → stop + say so. Moving an item to BUILD_PLAN §4 = Keagan's decision alone, with a changed reason. -->

# FUTURE_IDEAS.md — parking lot (do NOT build)

## Parked 2026-07-13 (start of Phase 3)
- **Creator marketplace** — two-sided product with no creators/buyers; also blocked: monetization needs leaving Hobby + processor #6 + pricing #7 (all together). Revisit: real users + evidence people want to publish here vs Etsy/own site.
- **Native iOS/Android** — no usage data = no case; PWA is installable/offline/home-screen (BUSINESS_PLAN §5). Revisit: data showing push/discovery limits growth.
- **Local-lumber-price cost estimator** — no free perpetual licensed price source (paid vendor breaks $0; scraping = legal + fragile + confidently-wrong prices). Superseded by cost-tiers-only ($/$$/$$$, no dollar figures).

## Previously considered, never approved
- Comments on plans (distinct from reviews, shipped Sprint 10) · tool-substitution notes · plan versioning · convert-to-metric (a "2x4" doesn't convert honestly).
- **Owned-tools profile / tool-aware search — ✅ SHIPPED (Sprints 25–26), no longer parked.** Search plans by selecting tools you own (`/workshop` + tool-inventory-aware search). Pointer only; see BUILD_PLAN §4 / CLAUDE.md.

## Parked 2026-07-19 (QOL/UI pass — each a new product surface, none in BUSINESS_PLAN)
- CNC plans (new plan type: toolpaths not cut lists; needs a taxonomy decision) · woodworking jig plans (maybe just a Category) · custom community-driven plans (plan-ownership licensing, don't rush) · lumber board-foot standalone calculator (own UI surface; distinct from the QOL-B per-material tooltip) · repository of known woodworking tools by skill level (a 2nd content type).
- **edge/end-grain cutting-board designer — ✅ PROMOTED 2026-07-24 (Keagan).** Now BUILD_PLAN Sprint 47+; plan `docs/superpowers/plans/cutting-board-designer-build-plan.md`; decisions in DECISIONS_LOG 2026-07-24. No longer parked.
- **Site map** + **SEO optimization** — blocker LIFTED (site indexable, `SITE_INDEXABLE=true`, branding resolved). No longer blocked; simply NOT SCHEDULED (not in BUSINESS_PLAN).

## Parked 2026-07-24 (removed briefs, recover from git if scheduled)
- Catalog audit & enrichment pass over `content/plans/*.json` — the one live piece = re-publish the 489 hidden Kreg plans once a 2nd cut-list parse fills empty `cutList` (tracked in BUILD_PLAN follow-ups + CLAUDE.md §6). Briefs `PLAN_AUDIT_BRIEF.md`/`step-detail-rewrite-sample.md` removed 2026-07-24.
- Step-detail depth rewrite (content pass to "buildable by reading alone"; runtime `src/lib/step-format.ts` already improves presentation). Sample removed, in git history.

Revisit any: Keagan adds it to BUSINESS_PLAN himself.
