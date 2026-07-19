-- QOL-E — learning-path taxonomy: experience level + category.
--
-- BOTH COLUMNS ARE NULLABLE, and that is the whole safety story for this migration.
--
-- A migration creates a column; it does not populate one. Path content reaches
-- production ONLY through a seed run (schema deploys, data does not — see DEPLOYMENT.md),
-- which is exactly how Sprint 4's `searchVector` shipped empty to production and made
-- search return nothing for everything while dev worked perfectly.
--
-- A NOT NULL column with a default would have hidden that: every existing path would have
-- silently claimed to be `experienceLevel = 1` (Beginner) — a confident wrong answer on a
-- page whose entire job is telling someone where to start. Nullable means an untagged path
-- renders as "not yet rated" and lands in its own group: visibly incomplete, which is
-- honest, and self-correcting the moment the seed runs.
--
-- So there is NO backfill here on purpose. The five authored paths carry their tags in
-- `content/paths/*.json`; running the seed is what applies them.

-- AlterTable
ALTER TABLE "Path" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "experienceLevel" INTEGER;

-- CreateIndex
CREATE INDEX "Path_experienceLevel_idx" ON "Path"("experienceLevel");

-- CreateIndex
CREATE INDEX "Path_categoryId_idx" ON "Path"("categoryId");

-- AddForeignKey
-- ON DELETE SET NULL, not CASCADE: deleting a category must never delete the learning
-- paths that happened to be about it. A path is authored content in its own right; it
-- would simply become an uncategorised one.
ALTER TABLE "Path" ADD CONSTRAINT "Path_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
