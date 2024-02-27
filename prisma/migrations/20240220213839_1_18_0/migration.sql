-- CreateIndex
CREATE INDEX "messages_message_id_idx" ON "messages"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "warnings_chat_id_message_id_key" ON "warnings"("chat_id", "message_id");

-- DropForeignKey
ALTER TABLE "voteban_ban_voters" DROP CONSTRAINT "voteban_ban_voters_voteban_id_fkey";

-- DropForeignKey
ALTER TABLE "voteban_no_ban_voters" DROP CONSTRAINT "voteban_no_ban_voters_voteban_id_fkey";

-- AlterTable
ALTER TABLE "chat_settings_history" DROP CONSTRAINT "chat_settings_history_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "chat_settings_history_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ChatSettingsHistory_id_seq";

-- AlterTable
ALTER TABLE "messages" DROP CONSTRAINT "messages_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "messages_id_seq";

-- AlterTable
ALTER TABLE "profane_words" DROP CONSTRAINT "profane_words_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "profane_words_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ProfaneWord_id_seq";

-- AlterTable
ALTER TABLE "voteban_ban_voters" DROP CONSTRAINT "voteban_ban_voters_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "voteban_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "voteban_ban_voters_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VotebanBanVoter_id_seq";

-- AlterTable
ALTER TABLE "voteban_no_ban_voters" DROP CONSTRAINT "voteban_no_ban_voters_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "voteban_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "voteban_no_ban_voters_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VotebanNoBanVoter_id_seq";

-- AlterTable
ALTER TABLE "votebans" DROP CONSTRAINT "votebans_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "votebans_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Voteban_id_seq";

-- AlterTable
ALTER TABLE "warnings" DROP CONSTRAINT "warnings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "warnings_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "warnings_id_seq";

-- AddForeignKey
ALTER TABLE "voteban_ban_voters" ADD CONSTRAINT "voteban_ban_voters_voteban_id_fkey" FOREIGN KEY ("voteban_id") REFERENCES "votebans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteban_no_ban_voters" ADD CONSTRAINT "voteban_no_ban_voters_voteban_id_fkey" FOREIGN KEY ("voteban_id") REFERENCES "votebans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
