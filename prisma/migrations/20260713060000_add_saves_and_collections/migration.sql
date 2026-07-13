-- Sprint 6: saved plans and user-defined collections.
--
-- Every row here is owned by exactly one user. The unique constraints are scoped
-- BY USER, not globally — two people may both save the same plan, and two people
-- may both have a folder called "Kitchen". Obviously.
--
-- ON DELETE CASCADE from User: deleting a user removes their saves and folders.
-- ON DELETE CASCADE from Plan: retiring a plan removes the dangling saves.
-- Cascade from Collection hits CollectionPlan only — deleting a folder must NOT
-- unsave the plans inside it.

-- CreateTable
CREATE TABLE "SavedPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPlan" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "savedPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedPlan_userId_idx" ON "SavedPlan"("userId");

-- CreateIndex
CREATE INDEX "SavedPlan_planId_idx" ON "SavedPlan"("planId");

-- CreateIndex
-- Idempotent saves at the DATABASE level: a double-tapped save button cannot
-- create two rows, whatever the application layer does.
CREATE UNIQUE INDEX "SavedPlan_userId_planId_key" ON "SavedPlan"("userId", "planId");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
-- Unique PER USER. Two people may both have a "Kitchen" folder.
CREATE UNIQUE INDEX "Collection_userId_name_key" ON "Collection"("userId", "name");

-- CreateIndex
CREATE INDEX "CollectionPlan_collectionId_idx" ON "CollectionPlan"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionPlan_savedPlanId_idx" ON "CollectionPlan"("savedPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPlan_collectionId_savedPlanId_key" ON "CollectionPlan"("collectionId", "savedPlanId");

-- AddForeignKey
ALTER TABLE "SavedPlan" ADD CONSTRAINT "SavedPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPlan" ADD CONSTRAINT "SavedPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPlan" ADD CONSTRAINT "CollectionPlan_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPlan" ADD CONSTRAINT "CollectionPlan_savedPlanId_fkey" FOREIGN KEY ("savedPlanId") REFERENCES "SavedPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
