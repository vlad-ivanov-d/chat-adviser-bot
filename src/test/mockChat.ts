import { Chat } from "telegraf/typings/core/types/typegram";

/**
 * Mocks Telegram group chat
 * @param chat Telegram group chat which will be merged with the default one
 * @returns Telegram group chat
 */
export const mockGroupChat = (chat?: Partial<Chat.GroupChat>): Chat.GroupChat => ({
  id: 11,
  title: "Test Group",
  type: "group",
  ...chat,
});

/**
 * Mocks Telegram private chat
 * @param chat Telegram private chat which will be merged with the default one
 * @returns Telegram private chat
 */
export const mockPrivateChat = (chat?: Partial<Chat.PrivateChat>): Chat.PrivateChat => ({
  first_name: "John",
  id: 1,
  last_name: "Doe",
  type: "private",
  username: "john_doe",
  ...chat,
});

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
