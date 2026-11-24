-- AlterTable
ALTER TABLE "Chore" ADD COLUMN     "doubloons" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "DoubloonEntry" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "choreId" TEXT,
    "roundDue" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoubloonEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treasure" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treasure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoubloonEntry_createdAt_idx" ON "DoubloonEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DoubloonEntry_choreId_roundDue_key" ON "DoubloonEntry"("choreId", "roundDue");

-- AddForeignKey
ALTER TABLE "DoubloonEntry" ADD CONSTRAINT "DoubloonEntry_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
