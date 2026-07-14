-- Sprint 19 — the plan-view log, behind the Trending and Most Viewed sorts.
--
-- ONE NEW TABLE. Nothing is computed from existing rows, so there is NO PRODUCTION
-- BACKFILL to forget — the trap that shipped an empty `searchVector` in Sprint 4 and
-- hid for three sprints. An empty PlanView table is the CORRECT state on day one:
-- nobody has viewed anything yet, and the sorts are honest about that (see
-- src/lib/views.ts — with no rows, Trending tiebreaks to newest-first).
--
-- NO `userId` COLUMN, deliberately. This table is a browsing history if it has one,
-- and the two sorts it feeds only need counts. See prisma/schema.prisma for the full
-- reasoning. It also means the Clerk deletion webhook has nothing to clean up here.

-- CreateTable
CREATE TABLE "PlanView" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Trending counts rows for one plan inside a time window: (planId, viewedAt) is what
-- makes that an index scan. This table grows with TRAFFIC, not with content, so it
-- will be the largest table in the database — the index is not premature.
CREATE INDEX "PlanView_planId_viewedAt_idx" ON "PlanView"("planId", "viewedAt");

-- CreateIndex
CREATE INDEX "PlanView_viewedAt_idx" ON "PlanView"("viewedAt");

-- AddForeignKey
-- CASCADE: deleting a plan deletes its view rows. There is no user link to cascade.
ALTER TABLE "PlanView" ADD CONSTRAINT "PlanView_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
