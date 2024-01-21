-- AlterEnum
ALTER TYPE "ChatSettingName" ADD VALUE 'has_warnings';

-- DropIndex
DROP INDEX "messages_chat_id_idx";

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "has_warnings" BOOLEAN;

-- AlterTable
ALTER TABLE "votebans" RENAME COLUMN "media_group_id" TO "candidate_media_group_id";

-- CreateTable
CREATE TABLE "warnings" (
    "id" BIGSERIAL NOT NULL,
    "author_id" DOUBLE PRECISION NOT NULL,
    "chat_id" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editor_id" DOUBLE PRECISION NOT NULL,
    "message_id" DOUBLE PRECISION NOT NULL,
    "sender_chat_id" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warnings_created_at_idx" ON "warnings"("created_at");

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_sender_chat_id_fkey" FOREIGN KEY ("sender_chat_id") REFERENCES "sender_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
