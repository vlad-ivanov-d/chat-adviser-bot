import type { Chat } from "telegraf/typings/core/types/typegram";

import { adminUser } from "./users";

/**
 * Telegram channel chat
 */
export const channel: Chat.ChannelChat = {
  id: 10,
  title: "Test Channel",
  type: "channel",
  username: "test_channel",
};

/**
 * Telegram group chat
 */
export const group: Chat.GroupChat = {
  id: 11,
  title: "Test Group",
  type: "group",
};

/**
 * Telegram private chat
 */
export const privateChat: Chat.PrivateChat = {
  first_name: adminUser.first_name,
  id: adminUser.id,
  last_name: adminUser.last_name,
  type: "private",
  username: adminUser.username,
};

/**
 * Telegram supergroup chat
 */
export const supergroup: Chat.SupergroupChat = {
  id: 12,
  title: "Test Supergroup",
  type: "supergroup",
  username: "test_supergroup",
};
