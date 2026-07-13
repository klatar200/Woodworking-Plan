-- Sprint 16 — skill-building learning paths.
--
-- NEW TABLES ONLY. Nothing is computed from existing rows, so — unlike Sprint 4's
-- `searchVector` and Sprint 6's saves — there is NO PRODUCTION BACKFILL to forget.
--
-- That is by design, not luck: path progress is DERIVED FROM THE `Review` TABLE on read,
-- so there is no progress column here to create empty and then quietly lie about.
--
-- ⚠️ BUT THE PATH CONTENT ITSELF IS DATA, AND DATA DOES NOT FLOW TO PRODUCTION ON DEPLOY.
-- The migration creates the tables; `prisma/seed.ts` fills them, and the seed only ever
-- runs against dev. Production needs a manual seed — see DEPLOYMENT.md. This is the exact
-- trap that shipped an empty search index in Sprint 4 and hid for three sprints.

-- CreateTable
CREATE TABLE "Path" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Path_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "PathStep_pkey" PRIMARY KEY ("id")
);

-- Step numbers are 1-based. A step 0 (or a negative one) would sort before everything and
-- render as "Step 0", which is not a thing.
ALTER TABLE "PathStep" ADD CONSTRAINT "PathStep_stepNumber_positive" CHECK ("stepNumber" >= 1);

-- CreateIndex
CREATE UNIQUE INDEX "Path_slug_key" ON "Path"("slug");

-- CreateIndex
CREATE INDEX "Path_published_idx" ON "Path"("published");

-- CreateIndex
CREATE INDEX "Path_sortOrder_idx" ON "Path"("sortOrder");

-- CreateIndex
-- Two steps cannot both be "step 3", and a plan appears at most once in a given path.
-- Enforced by the DATABASE: a seed file with a duplicated step number fails loudly rather
-- than producing a path whose order depends on row insertion.
CREATE UNIQUE INDEX "PathStep_pathId_stepNumber_key" ON "PathStep"("pathId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PathStep_pathId_planId_key" ON "PathStep"("pathId", "planId");

-- CreateIndex
CREATE INDEX "PathStep_pathId_idx" ON "PathStep"("pathId");

-- CreateIndex
CREATE INDEX "PathStep_planId_idx" ON "PathStep"("planId");

-- AddForeignKey
ALTER TABLE "PathStep" ADD CONSTRAINT "PathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "Path"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathStep" ADD CONSTRAINT "PathStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
