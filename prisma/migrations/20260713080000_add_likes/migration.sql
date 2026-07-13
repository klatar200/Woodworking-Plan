-- Sprint 7: likes.
--
-- Note what this migration does NOT add: a `likeCount` column on Plan.
--
-- A denormalized count is DERIVED DATA, and derived data is what broke production
-- twice on this project — Sprint 4's `searchVector` shipped to production as an
-- empty column, and Sprint 6's schema never arrived at all. A migration creates a
-- column; it does not populate it.
--
-- The count is computed on read (Prisma `_count` on this relation). Nothing to
-- backfill, nothing that can drift out of step with the actual rows.

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Like_userId_idx" ON "Like"("userId");

-- CreateIndex
-- The Popular sort counts likes per plan. This index is what makes that a cheap
-- index scan rather than a sequential scan of the whole table.
CREATE INDEX "Like_planId_idx" ON "Like"("planId");

-- CreateIndex
-- One like per user per plan, enforced by the DATABASE. A double-tapped like
-- button cannot inflate the count, whatever the application layer does.
CREATE UNIQUE INDEX "Like_userId_planId_key" ON "Like"("userId", "planId");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
