/*
  Warnings:

  - Added the required column `displayTitle` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" RENAME COLUMN "title" TO "displayTitle";
ALTER TABLE "Chat" ADD COLUMN "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "Voteban" ADD COLUMN     "authorSenderChatId" DOUBLE PRECISION,
ADD COLUMN     "candidateSenderChatId" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "SenderChat" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "firstName" TEXT,
    "id" DOUBLE PRECISION NOT NULL,
    "lastName" TEXT,
    "title" TEXT,
    "type" "ChatType" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,

    CONSTRAINT "SenderChat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SenderChat" ADD CONSTRAINT "SenderChat_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderChat" ADD CONSTRAINT "SenderChat_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_authorSenderChatId_fkey" FOREIGN KEY ("authorSenderChatId") REFERENCES "SenderChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_candidateSenderChatId_fkey" FOREIGN KEY ("candidateSenderChatId") REFERENCES "SenderChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
