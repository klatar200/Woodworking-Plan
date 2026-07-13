-- Sprint 4: full-text keyword search.
--
-- Adds a weighted tsvector column to Plan, plus the GIN index that makes
-- searching it fast. The column is populated by the seed pipeline
-- (prisma/seed.ts), which is the only write path for plan content.
--
-- Why a denormalized column rather than searching the related tables directly:
-- BUSINESS_PLAN.md §4.5 requires search across titles, descriptions, tags, TOOLS
-- and MATERIALS. Tools and materials live in other tables, so a live query would
-- mean joining and aggregating on every search. Precomputing one indexed vector
-- turns that into a single index lookup.

-- CreateColumn
ALTER TABLE "Plan" ADD COLUMN "searchVector" tsvector;

-- CreateIndex
-- GIN is the correct index type for tsvector: it indexes each lexeme, so a
-- containment query hits the index instead of scanning every row.
CREATE INDEX "Plan_searchVector_idx" ON "Plan" USING GIN ("searchVector");
