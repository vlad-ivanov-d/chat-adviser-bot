import { SenderChat as PrismaSenderChat, User as PrismaUser } from "@prisma/client";
import { Telegraf } from "telegraf";
import { Chat, InlineKeyboardButton, User } from "telegraf/typings/core/types/typegram";
import { encodeText } from "utils/encode";
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

/**
 * Tries to resolve Telegram error code from unknown error
 * @param error Unknown error
 * @returns Telegram error code or undefined
 */
export const getTelegramErrorCode = (error: unknown): number | undefined => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "error_code" in error.response &&
    typeof error.response.error_code === "number"
  ) {
    return error.response.error_code;
  }
  return undefined;
};

/**
 * Gets user title
 * @param user Telegram or Prisma user
 * @param format Title format
 * @returns User title
 */
export const getUserTitle = (user: User | PrismaUser, format: "full" | "short"): string => {
  if (user.username) {
    return `@${user.username}`;
  }
  const firstName = "firstName" in user ? user.firstName : user.first_name;
  const lastName = "lastName" in user ? user.lastName : user.last_name;
  return [firstName, lastName]
    .filter((p) => p)
    .slice(0, format === "short" ? 1 : undefined)
    .join(" ");
};

/**
 * Gets the link to user
 * @param user Telegram or Prisma user
 * @returns Returns user link HTML
 */
export const getUserHtmlLink = (user: User | PrismaUser): string => {
  const title = getUserTitle(user, "short");
  return `<a href="tg:user?id=${user.id}">${encodeText(title)}</a>`;
};

/**
 * Gets chat display title
 * @param chat Telegram chat or Prisma sender chat
 * @returns Returns display title
 */
export const getChatDisplayTitle = (chat: Chat | PrismaSenderChat): string => {
  switch (chat.type) {
    case "channel":
    case "supergroup":
      return chat.username ? `@${chat.username}` : chat.title ?? "";
    case "private": {
      const privateChatAsUser: User = {
        first_name: "firstName" in chat ? chat.firstName ?? "" : chat.first_name,
        id: chat.id,
        is_bot: false,
        last_name: "lastName" in chat ? chat.lastName ?? "" : chat.last_name,
        username: chat.username ?? undefined,
      };
      return getUserTitle(privateChatAsUser, "full");
    }
    default:
      return chat.title ?? "";
  }
};

/**
 * Gets chat link
 * @param chat Telegram chat or Prisma sender chat
 * @returns Returns link
 */
export const getChatHtmlLink = (chat: Chat | PrismaSenderChat): string => {
  if ("username" in chat && chat.username) {
    return `@${chat.username}`;
  }
  const displayTitle = getChatDisplayTitle(chat);
  return `<b>${encodeText(displayTitle)}</b>`;
};

/**
 * Gets chat or user link. Chat will be used as a priority if defined.
 * @param user Telegram or Prisma user
 * @param chat Telegram chat or Prisma sender chat
 * @returns Returns user link HTML
 */
export const getUserOrChatHtmlLink = (user: User | PrismaUser, chat?: Chat | PrismaSenderChat | null): string =>
  chat ? getChatHtmlLink(chat) : getUserHtmlLink(user);

/**
 * Check if the user is chat admin
 * @param chatId Chat id
 * @param userId User id
 * @returns Returns true if the user is an admin. Returns undefined if the member list is not available.
 */
export const isChatAdmin = async (chatId: number, userId: number): Promise<boolean | undefined> => {
  const member = await bot.telegram.getChatMember(chatId, userId).catch((e) => {
    const errorCode = getTelegramErrorCode(e);
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
    const errorCode = getTelegramErrorCode(e);
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
