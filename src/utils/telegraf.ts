import { ChatType as PrismaChatType, SenderChat as PrismaSenderChat, User as PrismaUser } from "@prisma/client";
import { Telegraf, Telegram } from "telegraf";
import { Chat, InlineKeyboardButton, User } from "telegraf/typings/core/types/typegram";
import { CallbackCtx } from "types/telegrafContext";

export interface CallbackQueryParams {
  /**
   * Callback action
   */
  action: string;
  /**
   * Chat id
   */
  chatId: number;
  /**
   * Skip
   */
  skip?: number;
  /**
   * Value as a string
   */
  value: string | null;
  /**
   * Values as a number
   */
  valueNum: number;
}

/**
 * Gets callback query parameters.
 * @param ctx Callback context
 * @returns Callback query parameters
 */
export const getCallbackQueryParams = (ctx: CallbackCtx): CallbackQueryParams => {
  const params = new URLSearchParams(ctx.callbackQuery.data.split("?")[1] ?? "");
  const value = params.get("v");
  return {
    action: ctx.callbackQuery.data.split("?")[0],
    chatId: parseFloat(params.get("chatId") ?? ""),
    skip: params.get("skip") ? parseFloat(params.get("skip") ?? "0") : undefined,
    value,
    valueNum: parseFloat(value ?? ""),
  };
};

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
 * Gets chat display title
 * @param chat Telegram chat or Prisma sender chat
 * @returns Returns display title
 */
export const getChatDisplayTitle = (chat: Chat | PrismaSenderChat): string => {
  switch (chat.type) {
    case "channel":
    case "supergroup":
    case PrismaChatType.CHANNEL:
    case PrismaChatType.SUPERGROUP:
      return chat.username ? `@${chat.username}` : chat.title ?? "";
    case "private":
    case PrismaChatType.PRIVATE: {
      const privateChatAsUser: User = {
        first_name: "firstName" in chat ? chat.firstName ?? "" : chat.first_name,
        id: chat.id,
        is_bot: false,
        last_name: "lastName" in chat ? chat.lastName ?? "" : chat.last_name,
        username: chat.username ?? undefined,
      };
      return getUserDisplayName(privateChatAsUser, "full");
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
 * Tries to resolve Telegram error code from unknown error
 * @param error Unknown error
 * @returns Telegram error code or undefined
 */
export const getErrorCode = (error: unknown): number | undefined => {
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
 * Gets user display name
 * @param user Telegram or Prisma user
 * @param format Name format
 * @returns User display name
 */
export const getUserDisplayName = (user: User | PrismaUser, format: "full" | "short"): string => {
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
 * Gets user full name
 * @param user Telegram or Prisma user
 * @returns User full name
 */
export const getUserFullName = (user: User | PrismaUser): string => {
  const firstName = "firstName" in user ? user.firstName : user.first_name;
  const lastName = "lastName" in user ? user.lastName : user.last_name;
  return [firstName, lastName].filter((p) => p).join(" ");
};

/**
 * Gets the link to user
 * @param user Telegram or Prisma user
 * @returns Returns user link HTML
 */
export const getUserHtmlLink = (user: User | PrismaUser): string => {
  const displayName = getUserDisplayName(user, "short");
  return `<a href="tg:user?id=${user.id}">${encodeText(displayName)}</a>`;
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
 * Encodes text for Telegram HTML
 * @param text Text which should be encoded
 * @returns Encoded text
 */
export const encodeText = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/**
 * Check if the user is chat admin
 * @param telegram Telegram instance
 * @param chatId Chat id
 * @param userId User id
 * @returns Returns true if the user is an admin. Returns undefined if the member list is not available.
 */
export const isChatAdmin = async (telegram: Telegram, chatId: number, userId: number): Promise<boolean | undefined> => {
  const member = await telegram.getChatMember(chatId, userId).catch((e) => {
    const errorCode = getErrorCode(e);
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
 * @param telegram Telegram instance
 * @param chatId Chat id
 * @param userId User id
 * @returns Returns true if the user is a member. Returns undefined if the member list is not available.
 */
export const isChatMember = async (
  telegram: Telegram,
  chatId: number,
  userId: number,
): Promise<boolean | undefined> => {
  const member = await telegram.getChatMember(chatId, userId).catch((e) => {
    const errorCode = getErrorCode(e);
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
 * Kicks user from the chat
 * @param bot Telegraf bot instance
 * @param chatId Chat id
 * @param userId User id
 */
export const kickChatMember = async (bot: Telegraf, chatId: number, userId: number): Promise<void> => {
  await bot.telegram.banChatMember(chatId, userId);
  await bot.telegram.unbanChatMember(chatId, userId);
};
