-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('basic', 'pro');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'basic';


-- Parents who already exist keep everything they could use before.
UPDATE "Member" SET "plan" = 'pro' WHERE "role" = 'parent';
