-- CreateEnum
CREATE TYPE "MessagesOnBehalfOfChannelsRule" AS ENUM ('filter');

-- AlterEnum
ALTER TYPE "ChatSettingName" ADD VALUE 'messages_on_behalf_of_channels';

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "messages_on_behalf_of_channels" "MessagesOnBehalfOfChannelsRule";

-- AlterTable
ALTER TABLE "votebans" ADD COLUMN     "media_group_id" TEXT;

-- CreateTable
CREATE TABLE "messages" (
    "author_id" DOUBLE PRECISION NOT NULL,
    "chat_id" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editor_id" DOUBLE PRECISION NOT NULL,
    "media_group_id" TEXT,
    "message_id" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "messages_chat_id_media_group_id_idx" ON "messages"("chat_id", "media_group_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "messages_chat_id_message_id_key" ON "messages"("chat_id", "message_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
