-- CreateTable
CREATE TABLE "BoardDesign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardDesign_userId_updatedAt_idx" ON "BoardDesign"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "BoardDesign" ADD CONSTRAINT "BoardDesign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
