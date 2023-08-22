-- CreateEnum
CREATE TYPE "AddingBotsRule" AS ENUM ('restricted', 'restrictedAndBan');

-- CreateEnum
CREATE TYPE "ChatSettingName" AS ENUM ('addingBots', 'language', 'votebanLimit');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('channel', 'group', 'private', 'supergroup');

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('en', 'ru');

-- DropIndex
DROP INDEX "Voteban_created_idx";

-- AlterTable
ALTER TABLE "Chat" RENAME COLUMN "created" TO "createdAt";
ALTER TABLE "Chat" RENAME COLUMN "updated" TO "updatedAt";
ALTER TABLE "Chat" ALTER COLUMN "language" DROP DEFAULT;
ALTER TABLE "Chat" ADD COLUMN     "membersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Etc/UTC',
ALTER COLUMN "language" TYPE "LanguageCode" using "language"::TEXT::"LanguageCode",
ALTER COLUMN "restrictionOnAddingBots" TYPE "AddingBotsRule" using "restrictionOnAddingBots"::TEXT::"AddingBotsRule",
ALTER COLUMN "type" TYPE "ChatType" using "type"::TEXT::"ChatType",
ALTER COLUMN "votebanLimit" DROP NOT NULL,
ALTER COLUMN "votebanLimit" DROP DEFAULT;
ALTER TABLE "Chat" ALTER COLUMN "membersCount" DROP DEFAULT,
ALTER COLUMN "timeZone" DROP DEFAULT;
ALTER TABLE "Chat" RENAME COLUMN "restrictionOnAddingBots" TO "addingBots";

-- AlterTable
ALTER TABLE "User" RENAME COLUMN "created" TO "createdAt";
ALTER TABLE "User" RENAME COLUMN "updated" TO "updatedAt";

-- AlterTable
ALTER TABLE "Voteban" RENAME COLUMN "created" TO "createdAt";
ALTER TABLE "Voteban" RENAME COLUMN "updated" TO "updatedAt";

-- AlterTable
ALTER TABLE "VotebanBanVoter" RENAME COLUMN "created" TO "createdAt";
ALTER TABLE "VotebanBanVoter" RENAME COLUMN "updated" TO "updatedAt";

-- AlterTable
ALTER TABLE "VotebanNoBanVoter" RENAME COLUMN "created" TO "createdAt";
ALTER TABLE "VotebanNoBanVoter" RENAME COLUMN "updated" TO "updatedAt";

-- CreateTable
CREATE TABLE "ChatSettingsHistory" (
    "authorId" DOUBLE PRECISION NOT NULL,
    "chatId" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editorId" DOUBLE PRECISION NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "settingName" "ChatSettingName" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSettingsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatSettingsHistory_chatId_settingName_key" ON "ChatSettingsHistory"("chatId", "settingName");

-- CreateIndex
CREATE INDEX "Voteban_createdAt_idx" ON "Voteban"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatSettingsHistory" ADD CONSTRAINT "ChatSettingsHistory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSettingsHistory" ADD CONSTRAINT "ChatSettingsHistory_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSettingsHistory" ADD CONSTRAINT "ChatSettingsHistory_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
