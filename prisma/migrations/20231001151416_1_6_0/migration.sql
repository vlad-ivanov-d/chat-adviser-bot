-- CreateEnum
CREATE TYPE "ProfanityFilterRule" AS ENUM ('enabled');

-- AlterEnum
ALTER TYPE "ChatSettingName" ADD VALUE 'profanityFilter';

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "profanityFilter" "ProfanityFilterRule";

-- CreateTable
CREATE TABLE "ProfaneWord" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "isRoot" BOOLEAN,
    "language" "LanguageCode" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "word" TEXT NOT NULL,

    CONSTRAINT "ProfaneWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");

-- AddForeignKey
ALTER TABLE "ProfaneWord" ADD CONSTRAINT "ProfaneWord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfaneWord" ADD CONSTRAINT "ProfaneWord_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
