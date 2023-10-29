-- RenameTable
ALTER TABLE "Chat" RENAME TO "chats";

-- RenameTable
ALTER TABLE "ChatSettingsHistory" RENAME TO "chat_settings_history";

-- RenameTable
ALTER TABLE "SenderChat" RENAME TO "sender_chats";

-- RenameTable
ALTER TABLE "ProfaneWord" RENAME TO "profane_words";

-- RenameTable
ALTER TABLE "User" RENAME TO "users";

-- RenameTable
ALTER TABLE "Voteban" RENAME TO "votebans";

-- RenameTable
ALTER TABLE "VotebanBanVoter" RENAME TO "voteban_ban_voters";

-- RenameTable
ALTER TABLE "VotebanNoBanVoter" RENAME TO "voteban_no_ban_voters";

-- AlterTable
ALTER TABLE "chat_settings_history" RENAME CONSTRAINT "ChatSettingsHistory_pkey" TO "chat_settings_history_pkey";

-- AlterTable
ALTER TABLE "chats" RENAME CONSTRAINT "Chat_pkey" TO "chats_pkey";

-- AlterTable
ALTER TABLE "profane_words" RENAME CONSTRAINT "ProfaneWord_pkey" TO "profane_words_pkey";

-- AlterTable
ALTER TABLE "sender_chats" RENAME CONSTRAINT "SenderChat_pkey" TO "sender_chats_pkey";

-- AlterTable
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";

-- AlterTable
ALTER TABLE "voteban_ban_voters" RENAME CONSTRAINT "VotebanBanVoter_pkey" TO "voteban_ban_voters_pkey";

-- AlterTable
ALTER TABLE "voteban_no_ban_voters" RENAME CONSTRAINT "VotebanNoBanVoter_pkey" TO "voteban_no_ban_voters_pkey";

-- AlterTable
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_pkey" TO "votebans_pkey";

-- RenameForeignKey
ALTER TABLE "chat_settings_history" RENAME CONSTRAINT "ChatSettingsHistory_authorId_fkey" TO "chat_settings_history_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "chat_settings_history" RENAME CONSTRAINT "ChatSettingsHistory_chatId_fkey" TO "chat_settings_history_chatId_fkey";

-- RenameForeignKey
ALTER TABLE "chat_settings_history" RENAME CONSTRAINT "ChatSettingsHistory_editorId_fkey" TO "chat_settings_history_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "chats" RENAME CONSTRAINT "Chat_authorId_fkey" TO "chats_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "chats" RENAME CONSTRAINT "Chat_editorId_fkey" TO "chats_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "profane_words" RENAME CONSTRAINT "ProfaneWord_authorId_fkey" TO "profane_words_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "profane_words" RENAME CONSTRAINT "ProfaneWord_editorId_fkey" TO "profane_words_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "sender_chats" RENAME CONSTRAINT "SenderChat_authorId_fkey" TO "sender_chats_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "sender_chats" RENAME CONSTRAINT "SenderChat_editorId_fkey" TO "sender_chats_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "users" RENAME CONSTRAINT "User_authorId_fkey" TO "users_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "users" RENAME CONSTRAINT "User_editorId_fkey" TO "users_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "voteban_ban_voters" RENAME CONSTRAINT "VotebanBanVoter_authorId_fkey" TO "voteban_ban_voters_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "voteban_ban_voters" RENAME CONSTRAINT "VotebanBanVoter_editorId_fkey" TO "voteban_ban_voters_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "voteban_ban_voters" RENAME CONSTRAINT "VotebanBanVoter_votebanId_fkey" TO "voteban_ban_voters_votebanId_fkey";

-- RenameForeignKey
ALTER TABLE "voteban_no_ban_voters" RENAME CONSTRAINT "VotebanNoBanVoter_authorId_fkey" TO "voteban_no_ban_voters_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "voteban_no_ban_voters" RENAME CONSTRAINT "VotebanNoBanVoter_editorId_fkey" TO "voteban_no_ban_voters_editorId_fkey";

-- RenameForeignKey
ALTER TABLE "voteban_no_ban_voters" RENAME CONSTRAINT "VotebanNoBanVoter_votebanId_fkey" TO "voteban_no_ban_voters_votebanId_fkey";

-- RenameForeignKey
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_authorId_fkey" TO "votebans_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_authorSenderChatId_fkey" TO "votebans_authorSenderChatId_fkey";

-- RenameForeignKey
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_candidateId_fkey" TO "votebans_candidateId_fkey";

-- RenameForeignKey
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_candidateSenderChatId_fkey" TO "votebans_candidateSenderChatId_fkey";

-- RenameForeignKey
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_chatId_fkey" TO "votebans_chatId_fkey";

-- RenameForeignKey
ALTER TABLE "votebans" RENAME CONSTRAINT "Voteban_editorId_fkey" TO "votebans_editorId_fkey";

-- RenameIndex
ALTER INDEX "ChatSettingsHistory_chatId_settingName_key" RENAME TO "chat_settings_history_chatId_settingName_key";

-- RenameIndex
ALTER INDEX "Chat_displayTitle_idx" RENAME TO "chats_displayTitle_idx";

-- RenameIndex
ALTER INDEX "ProfaneWord_word_key" RENAME TO "profane_words_word_key";

-- RenameIndex
ALTER INDEX "User_updatedAt_idx" RENAME TO "users_updatedAt_idx";

-- RenameIndex
ALTER INDEX "VotebanBanVoter_authorId_votebanId_key" RENAME TO "voteban_ban_voters_authorId_votebanId_key";

-- RenameIndex
ALTER INDEX "VotebanNoBanVoter_authorId_votebanId_key" RENAME TO "voteban_no_ban_voters_authorId_votebanId_key";

-- RenameIndex
ALTER INDEX "Voteban_chatId_messageId_key" RENAME TO "votebans_chatId_messageId_key";

-- RenameIndex
ALTER INDEX "Voteban_createdAt_idx" RENAME TO "votebans_createdAt_idx";
