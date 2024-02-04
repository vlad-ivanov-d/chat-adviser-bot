-- AlterEnum
ALTER TYPE "MessagesOnBehalfOfChannelsRule" RENAME TO "ChannelMessageFilterRule";

-- AlterEnum
ALTER TYPE "ChatSettingName" ADD VALUE 'channel_message_filter';
COMMIT;

-- Migrate data
UPDATE "chat_settings_history" SET "setting_name" = 'channel_message_filter' WHERE "setting_name" = 'messages_on_behalf_of_channels';

-- AlterEnum
BEGIN;
CREATE TYPE "ChatSettingName_new" AS ENUM ('adding_bots', 'channel_message_filter', 'has_warnings', 'language', 'profanity_filter', 'time_zone', 'voteban_limit');
ALTER TABLE "chat_settings_history" ALTER COLUMN "setting_name" TYPE "ChatSettingName_new" USING ("setting_name"::text::"ChatSettingName_new");
ALTER TYPE "ChatSettingName" RENAME TO "ChatSettingName_old";
ALTER TYPE "ChatSettingName_new" RENAME TO "ChatSettingName";
DROP TYPE "ChatSettingName_old";
COMMIT;

-- AlterTable
ALTER TABLE "chats" RENAME COLUMN "messages_on_behalf_of_channels" TO "channel_message_filter";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

