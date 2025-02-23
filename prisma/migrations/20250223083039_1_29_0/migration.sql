-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('file', 'location', 'photo', 'poll', 'system', 'text', 'video');

-- AlterTable
ALTER TABLE "chat_settings" DROP COLUMN "summary",
DROP COLUMN "summary_type",
ADD COLUMN     "is_summary_enabled" BOOLEAN;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "forwarded_from" TEXT,
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'text';

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "type" DROP DEFAULT;
