-- Sprint 64 / U6: designer designs on the shopping list (membership).
-- Additive + nullable — no backfill.

-- DropNotNull
ALTER TABLE "ShoppingListEntry" ALTER COLUMN "planId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShoppingListEntry" ADD COLUMN "boardDesignId" TEXT;

-- CreateIndex
CREATE INDEX "ShoppingListEntry_boardDesignId_idx" ON "ShoppingListEntry"("boardDesignId");

-- CreateIndex
-- Postgres treats NULLs as distinct in UNIQUE, so plan-only rows (boardDesignId NULL)
-- may coexist freely; design-only rows are unique per (userId, boardDesignId).
-- Verified: existing @@unique([userId, planId]) likewise allows many NULL planId rows.
CREATE UNIQUE INDEX "ShoppingListEntry_userId_boardDesignId_key" ON "ShoppingListEntry"("userId", "boardDesignId");

-- AddForeignKey
ALTER TABLE "ShoppingListEntry" ADD CONSTRAINT "ShoppingListEntry_boardDesignId_fkey" FOREIGN KEY ("boardDesignId") REFERENCES "BoardDesign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one of planId / boardDesignId (DB backstop; actions must reject before insert).
ALTER TABLE "ShoppingListEntry" ADD CONSTRAINT "ShoppingListEntry_plan_xor_design_check" CHECK ((("planId" IS NULL) <> ("boardDesignId" IS NULL)));
