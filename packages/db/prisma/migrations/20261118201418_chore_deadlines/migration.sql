-- CreateEnum
CREATE TYPE "DoubloonKind" AS ENUM ('reward', 'penalty');

-- AlterTable
ALTER TABLE "Chore" ADD COLUMN     "flexible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settledThrough" DATE;

-- AlterTable
ALTER TABLE "DoubloonEntry" ADD COLUMN     "kind" "DoubloonKind" NOT NULL DEFAULT 'reward';
