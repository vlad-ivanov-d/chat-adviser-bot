-- CreateTable
CREATE TABLE "chat_settings" (
    "id" DOUBLE PRECISION NOT NULL,
    "adding_bots" "AddingBotsRule",
    "author_id" DOUBLE PRECISION NOT NULL,
    "channel_message_filter" "ChannelMessageFilterRule",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editor_id" DOUBLE PRECISION NOT NULL,
    "has_warnings" BOOLEAN,
    "language" "LanguageCode" NOT NULL,
    "profanity_filter" "ProfanityFilterRule",
    "time_zone" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voteban_limit" INTEGER,

    CONSTRAINT "chat_settings_pkey" PRIMARY KEY ("id")
);

-- Migrate data
INSERT INTO "chat_settings" (
  "id",
  "adding_bots",
  "author_id",
  "channel_message_filter",
  "created_at",
  "editor_id",
  "has_warnings",
  "language",
  "profanity_filter",
  "time_zone",
  "updated_at",
  "voteban_limit"
)
SELECT
  "id",
  "adding_bots",
  "author_id",
  "channel_message_filter",
  "created_at",
  "editor_id",
  "has_warnings",
  "language",
  "profanity_filter",
  "time_zone",
  "updated_at",
  "voteban_limit"
FROM "chats";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "adding_bots",
DROP COLUMN "channel_message_filter",
DROP COLUMN "has_warnings",
DROP COLUMN "language",
DROP COLUMN "profanity_filter",
DROP COLUMN "time_zone",
DROP COLUMN "voteban_limit",
ADD COLUMN     "settings_id" DOUBLE PRECISION;

-- AlterTable
UPDATE "chats"
SET "settings_id" = "id";
ALTER TABLE "chats"
ALTER COLUMN "settings_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "chats_settings_id_key" ON "chats"("settings_id");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "chat_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_settings" ADD CONSTRAINT "chat_settings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_settings" ADD CONSTRAINT "chat_settings_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
