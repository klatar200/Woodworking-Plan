-- Sprint 22 — the explicit shopping list.
--
-- ONE NEW TABLE. Nothing is computed from existing rows, so there is NO production
-- backfill (the Sprint 4 trap). An empty table is the CORRECT initial state: the
-- shopping list is now decoupled from saves (DECISIONS_LOG.md 2026-07-14), so it starts
-- empty for everyone and fills only when a user explicitly adds a plan. Saved plans do
-- NOT auto-migrate onto it — that decoupling is the whole point of the sprint.

-- CreateTable
CREATE TABLE "ShoppingListEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingListEntry_userId_idx" ON "ShoppingListEntry"("userId");

-- CreateIndex
CREATE INDEX "ShoppingListEntry_planId_idx" ON "ShoppingListEntry"("planId");

-- CreateIndex
-- Idempotent "add": a user can have a plan on the list at most once.
CREATE UNIQUE INDEX "ShoppingListEntry_userId_planId_key" ON "ShoppingListEntry"("userId", "planId");

-- AddForeignKey
ALTER TABLE "ShoppingListEntry" ADD CONSTRAINT "ShoppingListEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListEntry" ADD CONSTRAINT "ShoppingListEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
