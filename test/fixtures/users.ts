import type { User, UserFromGetMe } from "telegraf/typings/core/types/typegram";

/**
 * Chat admin Telegram user
 */
export const adminUser: User = {
  first_name: "John",
  id: 1,
  is_bot: false,
  language_code: "en",
  last_name: "Doe",
  username: "john_doe",
};

/**
 * Telegram bot info
 */
export const bot: UserFromGetMe = {
  can_join_groups: true,
  can_read_all_group_messages: true,
  first_name: "The Bot",
  id: 100_000,
  is_bot: true,
  supports_inline_queries: false,
  username: "the_bot",
};

/**
 * Telegram system channel bot
 */
export const systemChannelBot: User = {
  first_name: "The Channel",
  id: 136_817_688,
  is_bot: true,
  username: "Channel_Bot",
};

/**
 * Telegram user
 */
export const user: User = {
  first_name: "Jack",
  id: 2,
  is_bot: false,
  language_code: "en",
  last_name: "Green",
  username: "jack_green",
};
