-- Sprint 21 — per-step tools and materials.
--
-- TWO NEW JOIN TABLES ONLY. Nothing is computed from existing rows, so there is NO
-- production backfill to forget (the Sprint 4 trap). Empty is the correct initial state:
-- until the content files tag their steps, no step has tools/materials and the UI shows
-- none — the plan-level Tools/Materials tabs are unchanged and still authoritative.
--
-- ⚠️ THE TAGS THEMSELVES ARE CONTENT, AND CONTENT DOES NOT FLOW TO PRODUCTION ON DEPLOY.
-- This migration creates the tables; `prisma/seed.ts` fills them from content/plans/*.json,
-- and the seed only runs against the branch you point it at. Production needs a seed run —
-- see DEPLOYMENT.md. Same rule that shipped an empty search index in Sprint 4.
--
-- NO subset constraint lives here. "A step's tools must be a subset of the plan's tools"
-- is enforced at content-load time (src/content/load.ts), which can name the offending
-- file and step — a database CHECK could not, and a plain FK to Tool would happily accept
-- a tool the plan never declared.

-- CreateTable
CREATE TABLE "StepTool" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,

    CONSTRAINT "StepTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepMaterial" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "StepMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StepTool_stepId_toolId_key" ON "StepTool"("stepId", "toolId");

-- CreateIndex
CREATE INDEX "StepTool_toolId_idx" ON "StepTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "StepMaterial_stepId_materialId_key" ON "StepMaterial"("stepId", "materialId");

-- CreateIndex
CREATE INDEX "StepMaterial_materialId_idx" ON "StepMaterial"("materialId");

-- AddForeignKey
ALTER TABLE "StepTool" ADD CONSTRAINT "StepTool_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepTool" ADD CONSTRAINT "StepTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepMaterial" ADD CONSTRAINT "StepMaterial_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepMaterial" ADD CONSTRAINT "StepMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
