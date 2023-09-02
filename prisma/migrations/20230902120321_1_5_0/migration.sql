-- DropForeignKey
ALTER TABLE "ChatSettingsHistory" DROP CONSTRAINT "ChatSettingsHistory_chatId_fkey";

-- DropForeignKey
ALTER TABLE "Voteban" DROP CONSTRAINT "Voteban_chatId_fkey";

-- AddForeignKey
ALTER TABLE "ChatSettingsHistory" ADD CONSTRAINT "ChatSettingsHistory_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voteban" ADD CONSTRAINT "Voteban_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
