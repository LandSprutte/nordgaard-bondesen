-- Doubloons go into one chest per family. Penalties no longer belong to a
-- member; existing entries keep theirs, so nothing is lost.
ALTER TABLE "DoubloonEntry" ALTER COLUMN "memberId" DROP NOT NULL;
