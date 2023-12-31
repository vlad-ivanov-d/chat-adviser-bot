-- DropForeignKey
ALTER TABLE "chat_settings_history" DROP CONSTRAINT "chat_settings_history_authorId_fkey";

-- DropForeignKey
ALTER TABLE "chat_settings_history" DROP CONSTRAINT "chat_settings_history_chatId_fkey";

-- DropForeignKey
ALTER TABLE "chat_settings_history" DROP CONSTRAINT "chat_settings_history_editorId_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_authorId_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_editorId_fkey";

-- DropForeignKey
ALTER TABLE "sender_chats" DROP CONSTRAINT "sender_chats_authorId_fkey";

-- DropForeignKey
ALTER TABLE "sender_chats" DROP CONSTRAINT "sender_chats_editorId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_authorId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_editorId_fkey";

-- DropForeignKey
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_authorId_fkey";

-- DropForeignKey
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_authorSenderChatId_fkey";

-- DropForeignKey
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_candidateSenderChatId_fkey";

-- DropForeignKey
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_chatId_fkey";

-- DropForeignKey
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_editorId_fkey";

-- DropIndex
DROP INDEX "chat_settings_history_chatId_settingName_key";

-- DropIndex
DROP INDEX "chats_displayTitle_idx";

-- DropIndex
DROP INDEX "users_updatedAt_idx";

-- DropIndex
DROP INDEX "votebans_chatId_messageId_key";

-- DropIndex
DROP INDEX "votebans_createdAt_idx";

-- AlterTable
ALTER TABLE "chat_settings_history" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "chat_settings_history" RENAME COLUMN "chatId" TO "chat_id";
ALTER TABLE "chat_settings_history" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "chat_settings_history" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "chat_settings_history" RENAME COLUMN "settingName" TO "setting_name";
ALTER TABLE "chat_settings_history" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable
ALTER TABLE "chats" RENAME COLUMN "addingBots" TO "adding_bots";
ALTER TABLE "chats" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "chats" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "chats" RENAME COLUMN "displayTitle" TO "display_title";
ALTER TABLE "chats" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "chats" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "chats" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "chats" RENAME COLUMN "membersCount" TO "members_count";
ALTER TABLE "chats" RENAME COLUMN "profanityFilter" TO "profanity_filter";
ALTER TABLE "chats" RENAME COLUMN "timeZone" TO "time_zone";
ALTER TABLE "chats" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "chats" RENAME COLUMN "votebanLimit" TO "voteban_limit";

-- AlterTable
ALTER TABLE "sender_chats" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "sender_chats" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "sender_chats" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "sender_chats" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "sender_chats" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "sender_chats" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable
ALTER TABLE "users" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "users" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "users" RENAME COLUMN "languageCode" TO "language_code";
ALTER TABLE "users" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable
ALTER TABLE "votebans" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "votebans" RENAME COLUMN "authorSenderChatId" TO "author_sender_chat_id";
ALTER TABLE "votebans" RENAME COLUMN "candidateId" TO "candidate_id";
ALTER TABLE "votebans" RENAME COLUMN "candidateSenderChatId" TO "candidate_sender_chat_id";
ALTER TABLE "votebans" RENAME COLUMN "chatId" TO "chat_id";
ALTER TABLE "votebans" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "votebans" RENAME COLUMN "editorId" TO "editor_id";
ALTER TABLE "votebans" RENAME COLUMN "isCompleted" TO "is_completed";
ALTER TABLE "votebans" RENAME COLUMN "messageId" TO "message_id";
ALTER TABLE "votebans" RENAME COLUMN "updatedAt" TO "updated_at";

-- CreateIndex
CREATE UNIQUE INDEX "chat_settings_history_chat_id_setting_name_key" ON "chat_settings_history"("chat_id", "setting_name");

-- CreateIndex
CREATE INDEX "chats_display_title_idx" ON "chats"("display_title");

-- CreateIndex
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");

-- CreateIndex
CREATE INDEX "votebans_created_at_idx" ON "votebans"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "votebans_chat_id_message_id_key" ON "votebans"("chat_id", "message_id");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_settings_history" ADD CONSTRAINT "chat_settings_history_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_settings_history" ADD CONSTRAINT "chat_settings_history_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_settings_history" ADD CONSTRAINT "chat_settings_history_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_chats" ADD CONSTRAINT "sender_chats_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_chats" ADD CONSTRAINT "sender_chats_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votebans" ADD CONSTRAINT "votebans_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votebans" ADD CONSTRAINT "votebans_author_sender_chat_id_fkey" FOREIGN KEY ("author_sender_chat_id") REFERENCES "sender_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votebans" ADD CONSTRAINT "votebans_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votebans" ADD CONSTRAINT "votebans_candidate_sender_chat_id_fkey" FOREIGN KEY ("candidate_sender_chat_id") REFERENCES "sender_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votebans" ADD CONSTRAINT "votebans_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votebans" ADD CONSTRAINT "votebans_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
