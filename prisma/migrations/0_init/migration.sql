-- CreateEnum
CREATE TYPE "CostTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "timeMinMinutes" INTEGER NOT NULL,
    "timeMaxMinutes" INTEGER NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "costTier" "CostTier" NOT NULL,
    "costMinCents" INTEGER NOT NULL,
    "costMaxCents" INTEGER NOT NULL,
    "tags" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTool" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "essential" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "PlanTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "species" TEXT,
    "costCents" INTEGER,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutListItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "thicknessIn" DOUBLE PRECISION NOT NULL,
    "widthIn" DOUBLE PRECISION NOT NULL,
    "lengthIn" DOUBLE PRECISION NOT NULL,
    "material" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CutListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_slug_key" ON "Tool"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE INDEX "Plan_categoryId_idx" ON "Plan"("categoryId");

-- CreateIndex
CREATE INDEX "Plan_difficulty_idx" ON "Plan"("difficulty");

-- CreateIndex
CREATE INDEX "Plan_costTier_idx" ON "Plan"("costTier");

-- CreateIndex
CREATE INDEX "Plan_published_idx" ON "Plan"("published");

-- CreateIndex
CREATE INDEX "PlanTool_toolId_idx" ON "PlanTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTool_planId_toolId_key" ON "PlanTool"("planId", "toolId");

-- CreateIndex
CREATE INDEX "Material_planId_idx" ON "Material"("planId");

-- CreateIndex
CREATE INDEX "CutListItem_planId_idx" ON "CutListItem"("planId");

-- CreateIndex
CREATE INDEX "Step_planId_idx" ON "Step"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Step_planId_stepNumber_key" ON "Step"("planId", "stepNumber");

-- CreateIndex
CREATE INDEX "Image_planId_idx" ON "Image"("planId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTool" ADD CONSTRAINT "PlanTool_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTool" ADD CONSTRAINT "PlanTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutListItem" ADD CONSTRAINT "CutListItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
