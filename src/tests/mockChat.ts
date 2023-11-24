import { Chat } from "telegraf/typings/core/types/typegram";

/**
 * Mocks Telegram supergroup chat
 * @param chat Telegram supergroup chat which will be merged with the default one
 * @returns Telegram supergroup chat
 */
export const mockSupergroupChat = (chat?: Partial<Chat.SupergroupChat>): Chat.SupergroupChat => ({
  id: 10,
  title: "Test Supergroup",
  type: "supergroup",
  username: "test_supergroup",
  ...chat,
});
