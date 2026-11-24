-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recurrence" "Recurrence" NOT NULL,
    "weekdays" INTEGER[],
    "monthWeeks" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreItem" (
    "id" TEXT NOT NULL,
    "choreId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "ChoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChoreItem_choreId_position_idx" ON "ChoreItem"("choreId", "position");

-- AddForeignKey
ALTER TABLE "ChoreItem" ADD CONSTRAINT "ChoreItem_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
