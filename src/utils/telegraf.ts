import { ChatType, MessageType, type SenderChat, type User as PrismaUser } from "@prisma/client";
import type { Telegram } from "telegraf";
import type { Chat, InlineKeyboardButton, User } from "telegraf/typings/core/types/typegram";

import { PAGE_SIZE } from "src/app.constants";
import type { CallbackCtx, EditedMessageCtx, MessageCtx } from "src/types/telegraf-context";

import { getErrorCode } from "./error";

export interface BuildCbDataParams {
  /**
   * Callback action
   */
  action: string;
  /**
   * Chat id
   */
  chatId?: number;
  /**
   * Skip
   */
  skip?: number;
  /**
   * Value
   */
  value?: boolean | number | string | null;
}

/**
 * Builds callback query data.
 * @param params Parameters
 * @returns Callback query data
 */
export const buildCbData = (params: BuildCbDataParams): string => {
  const urlSearchParams = new URLSearchParams();
  if (typeof params.chatId === "number") {
    urlSearchParams.set("cId", params.chatId.toString());
  }
  if (typeof params.skip === "number") {
    urlSearchParams.set("s", params.skip.toString());
  }
  if (typeof params.value !== "undefined" && params.value !== null) {
    urlSearchParams.set("v", params.value.toString());
  }
  return [params.action, urlSearchParams.toString()].filter((p) => p).join("?");
};

export interface ParseCbDataParams {
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
export const parseCbData = (ctx: CallbackCtx): ParseCbDataParams => {
  const params = new URLSearchParams(ctx.callbackQuery.data.split("?")[1]);
  const skip = params.get("s");
  const value = params.get("v");
  return {
    action: ctx.callbackQuery.data.split("?")[0],
    chatId: Number(params.get("cId") ?? params.get("chatId") ?? ""),
    skip: skip ? Number(skip) : undefined,
    value,
    valueNum: value ? Number(value) : NaN,
  };
};

export interface PaginationParams {
  /**
   * Callback action
   */
  action: string;
  /**
   * Chat id
   */
  chatId?: number;
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
   * @default 5
   */
  take?: number;
}

/**
 * Gets pagination buttons.
 * @param params Pagination parameters
 * @returns Buttons
 */
export const getPagination = (params: PaginationParams): InlineKeyboardButton[] => {
  const { action, chatId, count, skip, take = PAGE_SIZE } = params;
  return [
    ...(skip > 0
      ? [{ callback_data: buildCbData({ action, chatId, skip: Math.max(0, skip - take) }), text: "«" }]
      : []),
    ...(count > skip + take ? [{ callback_data: buildCbData({ action, chatId, skip: skip + take }), text: "»" }] : []),
  ];
};

/**
 * Gets chat display title.
 * @param chat Chat or sender chat
 * @returns Returns display title
 */
export const getChatDisplayTitle = (chat: Chat | SenderChat): string => {
  switch (chat.type) {
    case "channel":
    case "supergroup":
    case ChatType.CHANNEL:
    case ChatType.SUPERGROUP:
      return chat.username ? `@${chat.username}` : (chat.title ?? "");
    case "private":
    case ChatType.PRIVATE: {
      const privateChatAsUser: User = {
        first_name: "firstName" in chat ? (chat.firstName ?? "") : chat.first_name,
        id: chat.id,
        is_bot: false,
        last_name: "lastName" in chat ? (chat.lastName ?? "") : chat.last_name,
        username: chat.username ?? undefined,
      };
      return getUserDisplayName(privateChatAsUser, "full");
    }
    default:
      return chat.title ?? "";
  }
};

/**
 * Gets chat link.
 * @param chat Chat or sender chat
 * @returns Returns link
 */
export const getChatHtmlLink = (chat: Chat | SenderChat): string => {
  if ("username" in chat && chat.username) {
    return `@${chat.username}`;
  }
  const displayTitle = getChatDisplayTitle(chat);
  return `<b>${encodeText(displayTitle)}</b>`;
};

/**
 * Gets forwarded from name.
 * @param message Message
 * @returns Forwarded from name
 */
export const getForwardedFrom = (
  message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
): string | undefined => {
  const forwardedOrigin = "forward_origin" in message ? message.forward_origin : undefined;
  if (!forwardedOrigin) {
    return undefined;
  }
  if (forwardedOrigin.type === "channel") {
    // Do not use username
    return getChatDisplayTitle(
      "username" in forwardedOrigin.chat ? { ...forwardedOrigin.chat, username: undefined } : forwardedOrigin.chat,
    );
  }
  if (forwardedOrigin.type === "chat") {
    // Do not use username
    return getChatDisplayTitle(
      "username" in forwardedOrigin.sender_chat
        ? { ...forwardedOrigin.sender_chat, username: undefined }
        : forwardedOrigin.sender_chat,
    );
  }
  if (forwardedOrigin.type === "hidden_user") {
    return forwardedOrigin.sender_user_name;
  }
  // Do not use username
  return getUserFullName({ ...forwardedOrigin.sender_user, username: undefined });
};

/**
 * Gets the text from message.
 * @param message Message
 * @returns Text
 */
export const getMessageText = (
  message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
): string => {
  if ("document" in message && message.document.file_name) {
    return [message.document.file_name, message.caption].filter(Boolean).join("\n");
  }
  if ("caption" in message) {
    return message.caption ?? "";
  }
  if ("left_chat_member" in message) {
    return getUserFullName(message.left_chat_member);
  }
  if ("new_chat_members" in message) {
    return message.new_chat_members.map(getUserFullName).join(", ");
  }
  if ("poll" in message) {
    return [message.poll.question, ...message.poll.options.map((o) => o.text)].join("\n");
  }
  if ("sticker" in message && message.sticker.emoji) {
    return message.sticker.emoji;
  }
  if ("text" in message) {
    return message.text;
  }
  return "";
};

/**
 * Gets message type.
 * @param message Message
 * @returns Message type
 */
export const getMessageType = (
  message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
): MessageType => {
  if ("document" in message && message.document.file_name) {
    return MessageType.FILE;
  }
  if ("left_chat_member" in message || "new_chat_members" in message || "pinned_message" in message) {
    return MessageType.SYSTEM;
  }
  if ("location" in message) {
    return MessageType.LOCATION;
  }
  if ("photo" in message) {
    return MessageType.PHOTO;
  }
  if ("poll" in message) {
    return MessageType.POLL;
  }
  if ("video" in message) {
    return MessageType.VIDEO;
  }
  return MessageType.TEXT;
};

/**
 * Gets user display name.
 * @param user User
 * @param format Name format
 * @returns User display name
 */
export const getUserDisplayName = (user: User | PrismaUser, format: "full" | "short"): string => {
  if (user.username) {
    return `@${user.username}`;
  }
  const firstName = "firstName" in user ? user.firstName : user.first_name;
  const lastName = "lastName" in user ? user.lastName : user.last_name;
  return format === "short" ? firstName : [firstName, lastName].filter((p) => p).join(" ");
};

/**
 * Gets user full name.
 * @param user User
 * @returns User full name
 */
export const getUserFullName = (user: User | PrismaUser): string => {
  const firstName = "firstName" in user ? user.firstName : user.first_name;
  const lastName = "lastName" in user ? user.lastName : user.last_name;
  return [firstName, lastName].filter((p) => p).join(" ");
};

/**
 * Gets the link to user.
 * @param user User
 * @returns Returns user link HTML
 */
export const getUserHtmlLink = (user: User | PrismaUser): string => {
  const displayName = getUserDisplayName(user, "short");
  return `<a href="tg:user?id=${user.id.toString()}">${encodeText(displayName)}</a>`;
};

/**
 * Gets chat or user link. Chat will be used as a priority if defined.
 * @param user User
 * @param chat Chat or sender chat
 * @returns Returns user link HTML
 */
export const getUserOrChatHtmlLink = (user: User | PrismaUser, chat?: Chat | SenderChat | null): string =>
  chat ? getChatHtmlLink(chat) : getUserHtmlLink(user);

/**
 * Encodes text for Telegram HTML
 * @param text Text which should be encoded
 * @returns Encoded text
 */
export const encodeText = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/**
 * Check if the user is chat admin.
 * @param telegram Telegram instance
 * @param chatId Chat id
 * @param userId User id
 * @returns Returns true if the user is an admin. Returns undefined if the member list is not available.
 */
export const isChatAdmin = async (telegram: Telegram, chatId: number, userId: number): Promise<boolean | undefined> => {
  const member = await telegram.getChatMember(chatId, userId).catch((e: unknown) => {
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
  return member && (member.status === "administrator" || member.status === "creator");
};

/**
 * Check if the user is chat member.
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
  const member = await telegram.getChatMember(chatId, userId).catch((e: unknown) => {
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
