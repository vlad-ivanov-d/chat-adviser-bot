import { Chat, User } from "@prisma/client";
import { Telegraf } from "telegraf";
import { Chat as TelegramChat, InlineKeyboardButton, User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { GROUP_ANONYMOUS_BOT_ID } from "utils/consts";
import { BOT_TOKEN } from "utils/envs";

/**
 * Telegram bot client
 */
export const bot = new Telegraf(BOT_TOKEN);

export interface PaginationParams {
  /**
   * Total items count
   */
  count: number;
  /**
   * Skip items count
   */
  skip: number;
  /**
   * Page size
   */
  take: number;
}

/**
 * Gets pagination buttons
 * @param action User action
 * @param {PaginationParams} params Pagination parameters
 * @returns Buttons
 */
export const getPagination = (action: string, { count, skip, take }: PaginationParams): InlineKeyboardButton[] => {
  const actionPart = action.split("?")[0];
  const paramsPart = action.split("?")[1] ?? "";
  const prevParams = new URLSearchParams(paramsPart);
  prevParams.set("skip", Math.max(0, skip - take).toString());
  const nextParams = new URLSearchParams(paramsPart);
  nextParams.set("skip", (skip + take).toString());
  return [
    ...(skip > 0 ? [{ callback_data: `${actionPart}?${prevParams.toString()}`, text: "«" }] : []),
    ...(count > skip + take ? [{ callback_data: `${actionPart}?${nextParams.toString()}`, text: "»" }] : []),
  ];
};

export interface GetUserTitleParams {
  /**
   * Title format
   * @default full
   */
  format?: "short" | "full";
  /**
   * Encodes user title for HTML
   */
  shouldEncode?: boolean;
}

/**
 * Gets user title
 * @param user User object
 * @param chat Chat. It's important to handle Telegram anonymous admins and show chat title instead of admin.
 * @param params Params for user title formatting
 * @returns User title
 */
export const getUserTitle = (
  user: User | TelegramUser,
  chat: Chat | TelegramChat.AbstractChat | undefined,
  params: GetUserTitleParams = {},
): string => {
  const { format = "full", shouldEncode } = params;
  const isAnonym = user.id === GROUP_ANONYMOUS_BOT_ID;
  const firstName = (user as User).firstName ?? (user as TelegramUser).first_name;
  const lastName = (user as User).lastName ?? (user as TelegramUser).last_name;
  const title =
    (isAnonym && chat && chat.type !== "private" && (chat as Chat | TelegramChat.TitleChat).title) ||
    (user.username && `@${user.username}`) ||
    [firstName, lastName]
      .filter((p) => p)
      .slice(0, format === "short" ? 1 : undefined)
      .join(" ");
  return shouldEncode ? title.replaceAll("<", "&lt;").replaceAll(">", "&gt;") : title;
};

/**
 * Gets the link to user
 * @param user User object
 * @param chat Chat. It's important to handle Telegram anonymous admins and show chat title instead of admin.
 * @returns Returns user link HTML
 */
export const getUserHtmlLink = (
  user: TelegramUser | User,
  chat: Chat | TelegramChat.AbstractChat | undefined,
): string => {
  const title = getUserTitle(user, chat, { format: "short", shouldEncode: true });
  return user.id === GROUP_ANONYMOUS_BOT_ID && chat
    ? `<b>${title}</b>`
    : `<a href="tg:user?id=${user.id}">${title}</a>`;
};

/**
 * Check if the user is chat admin
 * @param chatId Chat id
 * @param userId User id
 * @returns Returns true if the user is an admin. Returns undefined if the member list is not available.
 */
export const isChatAdmin = async (chatId: number, userId: number): Promise<boolean | undefined> => {
  if (userId === GROUP_ANONYMOUS_BOT_ID) {
    return true;
  }
  const member = await bot.telegram.getChatMember(chatId, userId).catch((e) => {
    const errorCode = (e as { response?: { error_code?: number } })?.response?.error_code;
    switch (errorCode) {
      // User have never been in the chat
      case 400:
        return false;
      // Bot can't see the member list
      case 403:
      default:
        return undefined;
    }
  });
  return member && ["administrator", "creator"].includes(member.status);
};

/**
 * Check if the user is chat member
 * @param chatId Chat id
 * @param userId User id
 * @returns Returns true if the user is a member. Returns undefined if the member list is not available.
 */
export const isChatMember = async (chatId: number, userId: number): Promise<boolean | undefined> => {
  const member = await bot.telegram.getChatMember(chatId, userId).catch((e) => {
    const errorCode = (e as { response?: { error_code?: number } })?.response?.error_code;
    switch (errorCode) {
      // User have never been in the chat
      case 400:
        return false;
      // Bot can't see the member list
      case 403:
      default:
        return undefined;
    }
  });
  return member && ["administrator", "creator", "member", "restricted"].includes(member.status);
};

/**
 * Checks if the the command is clean and without arguments.
 * @param command Command
 * @param messageText Message text
 * @returns Returns true if the command is clean
 */
export const isCleanCommand = (command: string, messageText: string): boolean => {
  const commandLowerCase = command.toLowerCase();
  const normalizedMessageText = messageText.trim().toLowerCase();
  return [commandLowerCase, `/${commandLowerCase}`].includes(normalizedMessageText);
};

/**
 * Kicks user from the chat
 * @param chatId Chat id
 * @param userId User id
 */
export const kickChatMember = async (chatId: number, userId: number): Promise<void> => {
  await bot.telegram.banChatMember(chatId, userId);
  await bot.telegram.unbanChatMember(chatId, userId);
};
