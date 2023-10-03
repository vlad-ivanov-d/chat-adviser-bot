-- AlterTable
ALTER TABLE "ProfaneWord" ADD COLUMN     "comment" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "languageCode" TEXT;

-- AlterTable
ALTER TABLE "Voteban" DROP COLUMN "completed",
ADD COLUMN     "isCompleted" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "ProfaneWord_word_key" ON "ProfaneWord"("word");
