-- Families and logins. Everything that existed before belongs to the one
-- family there was, "Vores familie"; parents are added from the admin page.

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Family" ("id", "name", "updatedAt")
VALUES ('family_default', 'Vores familie', CURRENT_TIMESTAMP);

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('parent', 'child');

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('admin', 'family');

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_accountNumber_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_key_fkey";

-- DropIndex
DROP INDEX "Transaction_accountNumber_date_idx";

-- DropIndex
DROP INDEX "Transaction_date_idx";

-- DropIndex
DROP INDEX "Transaction_fingerprint_key";

-- DropIndex
DROP INDEX "Transaction_key_idx";

-- DropIndex
DROP INDEX "WeekChore_week_position_idx";

-- AlterTable
ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey",
ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default',
ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("familyId", "number");

-- AlterTable
ALTER TABLE "Category" DROP CONSTRAINT "Category_pkey",
ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default',
ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("familyId", "name");

-- AlterTable
ALTER TABLE "ChoreTemplate" ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default';

-- AlterTable
ALTER TABLE "DoubloonEntry" ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default';

-- AlterTable
ALTER TABLE "Import" ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "email" TEXT,
ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default',
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'child';

-- AlterTable
ALTER TABLE "TextKey" DROP CONSTRAINT "TextKey_pkey",
ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default',
ADD CONSTRAINT "TextKey_pkey" PRIMARY KEY ("familyId", "key");

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default';

-- AlterTable
ALTER TABLE "Treasure" ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default';

-- AlterTable
ALTER TABLE "WeekChore" ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default';

-- AlterTable
ALTER TABLE "WeekSettlement" DROP CONSTRAINT "WeekSettlement_pkey",
ADD COLUMN     "familyId" TEXT NOT NULL DEFAULT 'family_default',
ADD CONSTRAINT "WeekSettlement_pkey" PRIMARY KEY ("familyId", "week");

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "familyId" TEXT,
    "memberId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "ChoreTemplate_familyId_idx" ON "ChoreTemplate"("familyId");

-- CreateIndex
CREATE INDEX "DoubloonEntry_familyId_createdAt_idx" ON "DoubloonEntry"("familyId", "createdAt");

-- CreateIndex
CREATE INDEX "Import_familyId_importedAt_idx" ON "Import"("familyId", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_familyId_position_idx" ON "Member"("familyId", "position");

-- CreateIndex
CREATE INDEX "Transaction_familyId_accountNumber_date_idx" ON "Transaction"("familyId", "accountNumber", "date");

-- CreateIndex
CREATE INDEX "Transaction_familyId_date_idx" ON "Transaction"("familyId", "date");

-- CreateIndex
CREATE INDEX "Transaction_familyId_key_idx" ON "Transaction"("familyId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_familyId_fingerprint_key" ON "Transaction"("familyId", "fingerprint");

-- CreateIndex
CREATE INDEX "Treasure_familyId_idx" ON "Treasure"("familyId");

-- CreateIndex
CREATE INDEX "WeekChore_familyId_week_position_idx" ON "WeekChore"("familyId", "week", "position");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextKey" ADD CONSTRAINT "TextKey_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_familyId_accountNumber_fkey" FOREIGN KEY ("familyId", "accountNumber") REFERENCES "Account"("familyId", "number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_familyId_key_fkey" FOREIGN KEY ("familyId", "key") REFERENCES "TextKey"("familyId", "key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplate" ADD CONSTRAINT "ChoreTemplate_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekChore" ADD CONSTRAINT "WeekChore_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekSettlement" ADD CONSTRAINT "WeekSettlement_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubloonEntry" ADD CONSTRAINT "DoubloonEntry_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treasure" ADD CONSTRAINT "Treasure_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- New rows must say which family they belong to.
ALTER TABLE "Account" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "Category" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "ChoreTemplate" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "DoubloonEntry" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "Import" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "Member" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "TextKey" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "Treasure" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "WeekChore" ALTER COLUMN "familyId" DROP DEFAULT;
ALTER TABLE "WeekSettlement" ALTER COLUMN "familyId" DROP DEFAULT;
