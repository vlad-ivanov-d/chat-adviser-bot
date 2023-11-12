-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "AddingBotsRule" ADD VALUE 'ban';
ALTER TYPE "AddingBotsRule" ADD VALUE 'restrict';
COMMIT;

-- Migrate data
UPDATE "chats" SET "addingBots" = 'ban' WHERE "addingBots" = 'restrictedAndBan';
UPDATE "chats" SET "addingBots" = 'restrict' WHERE "addingBots" = 'restricted';

-- AlterEnum
BEGIN;
CREATE TYPE "AddingBotsRule_new" AS ENUM ('ban', 'restrict');
ALTER TABLE "chats" ALTER COLUMN "addingBots" TYPE "AddingBotsRule_new" USING ("addingBots"::text::"AddingBotsRule_new");
ALTER TYPE "AddingBotsRule" RENAME TO "AddingBotsRule_old";
ALTER TYPE "AddingBotsRule_new" RENAME TO "AddingBotsRule";
DROP TYPE "AddingBotsRule_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ChatSettingName" ADD VALUE 'adding_bots';
ALTER TYPE "ChatSettingName" ADD VALUE 'profanity_filter';
ALTER TYPE "ChatSettingName" ADD VALUE 'time_zone';
ALTER TYPE "ChatSettingName" ADD VALUE 'voteban_limit';
COMMIT;

-- Migrate data
UPDATE "chat_settings_history" SET "settingName" = 'adding_bots' WHERE "settingName" = 'addingBots';
UPDATE "chat_settings_history" SET "settingName" = 'profanity_filter' WHERE "settingName" = 'profanityFilter';
UPDATE "chat_settings_history" SET "settingName" = 'time_zone' WHERE "settingName" = 'timeZone';
UPDATE "chat_settings_history" SET "settingName" = 'voteban_limit' WHERE "settingName" = 'votebanLimit';

-- AlterEnum
BEGIN;
CREATE TYPE "ChatSettingName_new" AS ENUM ('adding_bots', 'language', 'profanity_filter', 'time_zone', 'voteban_limit');
ALTER TABLE "chat_settings_history" ALTER COLUMN "settingName" TYPE "ChatSettingName_new" USING ("settingName"::text::"ChatSettingName_new");
ALTER TYPE "ChatSettingName" RENAME TO "ChatSettingName_old";
ALTER TYPE "ChatSettingName_new" RENAME TO "ChatSettingName";
DROP TYPE "ChatSettingName_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ChatType" ADD VALUE 'unknown';

-- AlterEnum
ALTER TYPE "ProfanityFilterRule" ADD VALUE 'filter';
COMMIT;

-- Migrate data
UPDATE "chats" SET "profanityFilter" = 'filter' WHERE "profanityFilter" = 'enabled';

-- AlterEnum
BEGIN;
CREATE TYPE "ProfanityFilterRule_new" AS ENUM ('filter');
ALTER TABLE "chats" ALTER COLUMN "profanityFilter" TYPE "ProfanityFilterRule_new" USING ("profanityFilter"::text::"ProfanityFilterRule_new");
ALTER TYPE "ProfanityFilterRule" RENAME TO "ProfanityFilterRule_old";
ALTER TYPE "ProfanityFilterRule_new" RENAME TO "ProfanityFilterRule";
DROP TYPE "ProfanityFilterRule_old";
COMMIT;
