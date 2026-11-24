-- AlterEnum
ALTER TYPE "DoubloonKind" ADD VALUE 'purchase';

-- CreateTable
CREATE TABLE "ChoreTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doubloons" INTEGER NOT NULL DEFAULT 10,
    "items" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreTemplate_pkey" PRIMARY KEY ("id")
);

-- Existing chores become library templates, with their checklist in order.
INSERT INTO "ChoreTemplate" ("id", "title", "doubloons", "items", "createdAt", "updatedAt")
SELECT c."id", c."title", c."doubloons",
       COALESCE(ARRAY(SELECT i."label" FROM "ChoreItem" i WHERE i."choreId" = c."id" ORDER BY i."position"), '{}'),
       c."createdAt", CURRENT_TIMESTAMP
FROM "Chore" c;

-- The shared household purse is replaced by one purse per member.
DELETE FROM "DoubloonEntry";

-- DropForeignKey
ALTER TABLE "ChoreItem" DROP CONSTRAINT "ChoreItem_choreId_fkey";

-- DropForeignKey
ALTER TABLE "DoubloonEntry" DROP CONSTRAINT "DoubloonEntry_choreId_fkey";

-- DropIndex
DROP INDEX "DoubloonEntry_choreId_roundDue_key";

-- DropIndex
DROP INDEX "DoubloonEntry_createdAt_idx";

-- AlterTable
ALTER TABLE "DoubloonEntry" DROP COLUMN "choreId",
DROP COLUMN "roundDue",
ADD COLUMN     "memberId" TEXT NOT NULL,
ADD COLUMN     "treasureId" TEXT,
ADD COLUMN     "weekChoreId" TEXT,
ALTER COLUMN "kind" DROP DEFAULT;

-- DropTable
DROP TABLE "Chore";

-- DropTable
DROP TABLE "ChoreItem";

-- DropEnum
DROP TYPE "Recurrence";

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekChore" (
    "id" TEXT NOT NULL,
    "week" DATE NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "doubloons" INTEGER NOT NULL,
    "templateId" TEXT,
    "doneById" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekChore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekChoreItem" (
    "id" TEXT NOT NULL,
    "weekChoreId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WeekChoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekSettlement" (
    "week" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekSettlement_pkey" PRIMARY KEY ("week")
);

-- CreateIndex
CREATE INDEX "WeekChore_week_position_idx" ON "WeekChore"("week", "position");

-- CreateIndex
CREATE INDEX "WeekChoreItem_weekChoreId_position_idx" ON "WeekChoreItem"("weekChoreId", "position");

-- CreateIndex
CREATE INDEX "DoubloonEntry_memberId_createdAt_idx" ON "DoubloonEntry"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "DoubloonEntry_weekChoreId_idx" ON "DoubloonEntry"("weekChoreId");

-- AddForeignKey
ALTER TABLE "WeekChore" ADD CONSTRAINT "WeekChore_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekChore" ADD CONSTRAINT "WeekChore_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekChoreItem" ADD CONSTRAINT "WeekChoreItem_weekChoreId_fkey" FOREIGN KEY ("weekChoreId") REFERENCES "WeekChore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubloonEntry" ADD CONSTRAINT "DoubloonEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubloonEntry" ADD CONSTRAINT "DoubloonEntry_weekChoreId_fkey" FOREIGN KEY ("weekChoreId") REFERENCES "WeekChore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubloonEntry" ADD CONSTRAINT "DoubloonEntry_treasureId_fkey" FOREIGN KEY ("treasureId") REFERENCES "Treasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

