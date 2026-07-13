-- Sprint 10 — Reviews, ratings & build photos.
--
-- NOTE: this migration adds only NEW tables. It computes nothing from existing rows,
-- so unlike Sprint 4's `searchVector` and Sprint 6's saves, there is NO PRODUCTION
-- BACKFILL to forget. That is deliberate: the average rating is computed on read
-- (Prisma `_avg`/`_count`), not stored in a column this migration would have to fill.
-- See DEPLOYMENT.md and the Derived-data rule in CLAUDE.md.

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- The rating range, enforced by the DATABASE and not merely by the application.
--
-- The data layer validates 1-5 too, but an application-only check is one raw query,
-- one seed script, or one console session away from being bypassed — and a 7-star
-- review would silently poison the average on every plan that had one, with no error
-- anywhere. A CHECK constraint makes the invalid state unrepresentable.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

-- CreateTable
CREATE TABLE "BuildPhoto" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- One review per user per plan, enforced by the database. A double-submitted form
-- cannot produce two reviews, whatever the application layer believes.
CREATE UNIQUE INDEX "Review_userId_planId_key" ON "Review"("userId", "planId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_planId_idx" ON "Review"("planId");

-- CreateIndex
CREATE INDEX "BuildPhoto_reviewId_idx" ON "BuildPhoto"("reviewId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- Deleting a review deletes its photos' ROWS. It does NOT delete the BLOBS — object
-- storage has no foreign keys. src/lib/reviews.ts deletes the blobs explicitly first;
-- if that is ever skipped, orphaned files silently consume the 1 GB free tier forever.
ALTER TABLE "BuildPhoto" ADD CONSTRAINT "BuildPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
