import type { User, UserFromGetMe } from "telegraf/typings/core/types/typegram";

/**
 * Mocks Telegram bot
 * @param bot Telegram bot which will be merged with the default one
 * @returns Telegram bot
 */
export const mockBot = (bot?: Partial<UserFromGetMe>): UserFromGetMe => ({
  can_join_groups: true,
  can_read_all_group_messages: true,
  first_name: "The Bot",
  id: 100_000,
  is_bot: true,
  supports_inline_queries: false,
  username: "the_bot",
  ...bot,
});

/**
 * Mocks Telegram system channel bot
 * @returns Telegram bot
 */
export const mockChannelBot = (): User => ({
  first_name: "The Channel",
  id: 136_817_688,
  is_bot: true,
  username: "Channel_Bot",
});
