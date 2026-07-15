-- Sprint 25 — "My Workshop": the owned-tools profile.
--
-- ONE NEW JOIN TABLE. Nothing is computed from existing rows, so there is NO production
-- backfill (the Sprint 4 trap). Empty is the correct initial state: nobody owns any tools
-- until they declare them on /workshop. This does not touch the Sprint 5 per-session
-- tools FILTER, which persists nothing and lives only in the URL.

-- CreateTable
CREATE TABLE "UserTool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTool_userId_idx" ON "UserTool"("userId");

-- CreateIndex
CREATE INDEX "UserTool_toolId_idx" ON "UserTool"("toolId");

-- CreateIndex
-- Idempotent set membership: a user owns a given tool at most once.
CREATE UNIQUE INDEX "UserTool_userId_toolId_key" ON "UserTool"("userId", "toolId");

-- AddForeignKey
ALTER TABLE "UserTool" ADD CONSTRAINT "UserTool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTool" ADD CONSTRAINT "UserTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
