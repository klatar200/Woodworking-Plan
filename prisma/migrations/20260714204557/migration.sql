-- DropForeignKey
ALTER TABLE "StepTool" DROP CONSTRAINT "StepTool_toolId_fkey";

-- AddForeignKey
ALTER TABLE "StepTool" ADD CONSTRAINT "StepTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
