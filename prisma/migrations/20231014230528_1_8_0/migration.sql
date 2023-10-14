-- Migrate data
UPDATE "ProfaneWord" SET "word" = concat('*', word, '*') WHERE "isRoot" = true;

-- AlterTable
ALTER TABLE "ProfaneWord" DROP COLUMN "isRoot";
