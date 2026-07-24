# Step images — implementation plan

**Spec:** `docs/superpowers/specs/2026-07-24-step-images-build-guide-design.md`  
**Branch:** `cursor/step-images-build-guide-5b51`

## Tasks

1. Prisma: add `Step.imageUrl String?` + migration SQL
2. Seed: `imageUrl: s.image ?? null` on step create
3. `PlanSteps`: accept `images` for alt; render figure; layout CSS
4. Call sites: build + plan page pass `plan.images`
5. Print: image under body; print-safe CSS
6. Tests: seed round-trip or PlanSteps render; CSS token guard
7. Local migrate (+ seed if DB up); typecheck/test
8. Commit, push, update PR
