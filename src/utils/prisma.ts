import { ChatSettingName, LanguageCode, Prisma, PrismaClient, User } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { formatInTimeZone } from "date-fns-tz";
import { t } from "i18next";
import { Chat as TelegramChat, User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { PrismaChat } from "types/prismaChat";
import { DATE_FORMAT, DATE_LOCALES } from "utils/consts";
import { bot, getChatDisplayTitle, getUserHtmlLink, getUserTitle } from "utils/telegraf";

/**
 * Resolves language based on Telegram language code
 * @param languageCode Telegram lanugage code
 * @returns Language code which is supported by the bot
 */
const resolveLanguage = (languageCode: string | undefined): LanguageCode => {
  switch (languageCode) {
    case "ru":
      return "ru";
    case "en":
    default:
      return "en";
  }
};

/**
 * Resolves time zone based on Telegram language code
 * @param languageCode Telegram lanugage code
 * @returns Time zone identifier
 */
const resolveTimeZone = (languageCode: string | undefined): string => {
  switch (languageCode) {
    case "ru":
      return "Europe/Moscow";
    case "en":
    default:
      return "Etc/UTC";
  }
};

/**
 * Database client
 */
export const prisma = new PrismaClient();

/**
 * Adds modified info to the text
 * @param text Text
 * @param options Options
 * @param options.lng Language code
 * @param options.prismaChat Prisma chat
 * @param options.settingName Setting name
 * @returns Text with modified information if available
 */
export const joinModifiedInfo = (
  text: string,
  options: { lng: LanguageCode; prismaChat: PrismaChat; settingName: ChatSettingName },
): string => {
  const { lng, prismaChat, settingName } = options;
  const { chatSettingsHistory, timeZone } = prismaChat;
  const historyItem = chatSettingsHistory.find((s) => s.settingName === settingName);
  return [
    text,
    historyItem
      ? t("settings:modified", {
          DATE: formatInTimeZone(historyItem.updatedAt, timeZone, DATE_FORMAT, { locale: DATE_LOCALES[lng] }),
          USER: getUserHtmlLink(historyItem.editor),
          lng,
        })
      : "",
  ]
    .filter((p) => p)
    .join("\n");
};

/**
 * Checks the user is a chat admin
 * @param prismaChat Prisma chat
 * @param userId User id
 * @param senderChatId Sender chat id. A message can be send on behalf of current chat.
 * @returns True if admin
 */
export const isPrismaChatAdmin = (prismaChat: PrismaChat, userId: number, senderChatId?: number): boolean =>
  userId === prismaChat.id || // Private chat has the same id as a user
  senderChatId === prismaChat.id || // A message can be send on behalf of current chat
  prismaChat.admins.some((a) => a.id === userId); // Check admin list. IMPORTANT: other bots won't be in this array.

/**
 * Checks if chat exists in database
 * @param chatId Chat id
 * @returns True if chat exists
 */
export const isPrismaChatExists = async (chatId: number): Promise<boolean> => {
  const prismaChat = await prisma.chat.findUnique({ select: { id: true }, where: { id: chatId } });
  return prismaChat !== null;
};

/**
 * Gets chat from database. Chat will be created if it's not exists.
 * @param chat Telegram chat or chat id
 * @param editor Telegram user who makes upsert
 * @returns Prisma chat
 */
export const upsertPrismaChat = async (chat: TelegramChat, editor: TelegramUser): Promise<PrismaChat> => {
  const [admins, membersCount] = await Promise.all([
    // An expected error may happen if administrators are hidden
    chat.type === "private" ? [] : bot.telegram.getChatAdministrators(chat.id).catch(() => []),
    bot.telegram.getChatMembersCount(chat.id),
  ]);

  const displayTitle = getChatDisplayTitle(chat);
  const firstName = "first_name" in chat ? chat.first_name : null;
  const lastName = "last_name" in chat ? chat.last_name ?? null : null;
  const title = "title" in chat ? chat.title : null;
  const username = "username" in chat ? chat.username ?? null : null;

  const transaction = await prisma.$transaction([
    ...[editor, ...admins.map((a) => a.user)]
      .filter((u, i, arr) => arr.indexOf(u) === i) // Trim duplicates
      .map((u) => upsertPrismaUser(u, editor)),
    prisma.chat.upsert({
      create: {
        addingBots: ["group", "supergroup"].includes(chat.type) ? "restricted" : undefined,
        admins: { connect: admins.map((a) => ({ id: a.user.id })) },
        authorId: editor.id,
        displayTitle,
        editorId: editor.id,
        firstName,
        id: chat.id,
        language: resolveLanguage(editor.language_code),
        lastName,
        membersCount: membersCount ?? 0,
        profanityFilter: ["group", "supergroup"].includes(chat.type) ? "enabled" : undefined,
        timeZone: resolveTimeZone(editor.language_code),
        title,
        type: chat.type,
        username,
      },
      include: { admins: true, chatSettingsHistory: { include: { editor: true } } },
      update: {
        admins: { set: admins.map((a) => ({ id: a.user.id })) },
        displayTitle,
        editorId: editor.id,
        firstName,
        lastName,
        membersCount,
        title,
        type: chat.type,
        username,
      },
      where: { id: chat.id },
    }),
  ]);

  const prismaChat = transaction[transaction.length - 1];
  if (!("admins" in prismaChat)) {
    throw new Error("Something went wrong during chat upsertion");
  }

  return {
    ...prismaChat,
    // Patch bot private chat title
    displayTitle:
      prismaChat.id === editor.id && bot.botInfo ? getUserTitle(bot.botInfo, "full") : prismaChat.displayTitle,
  };
};

/**
 * Upserts prisma chat settings history
 * @param chatId Chat id
 * @param editorId User id
 * @param settingName Chat setting name
 * @returns Chat settings history id
 */
export const upsertPrismaChatSettingsHistory = (
  chatId: number,
  editorId: number,
  settingName: ChatSettingName,
): Prisma.Prisma__ChatSettingsHistoryClient<{ id: bigint }, never, DefaultArgs> =>
  prisma.chatSettingsHistory.upsert({
    create: { authorId: editorId, chatId, editorId, settingName },
    select: { id: true },
    update: { editorId },
    where: { chatId_settingName: { chatId, settingName } },
  });

/**
 * Creates or updates (if still not exist) sender chat in database
 * @param chat Telegram chat
 * @param editor Telegram user who makes upsert
 * @returns Prisma sender chat id
 */
export const upsertPrismaSenderChat = async (chat: TelegramChat, editor: TelegramUser): Promise<number> => {
  const firstName = "first_name" in chat ? chat.first_name : null;
  const lastName = "last_name" in chat ? chat.last_name ?? null : null;
  const title = "title" in chat ? chat.title : null;
  const username = "username" in chat ? chat.username ?? null : null;
  const [, prismaSenderChat] = await prisma.$transaction([
    upsertPrismaUser(editor, editor),
    prisma.senderChat.upsert({
      create: {
        authorId: editor.id,
        editorId: editor.id,
        firstName,
        id: chat.id,
        lastName,
        title,
        type: chat.type,
        username,
      },
      select: { id: true },
      update: { editorId: editor.id, firstName, lastName, title, type: chat.type, username },
      where: { id: chat.id },
    }),
  ]);
  return prismaSenderChat.id;
};

/**
 * Gets user from database. User will be created if it's not exists.
 * @param user Telegram user
 * @param editor Telegram user who makes upsert
 * @returns User
 */
export const upsertPrismaUser = (
  user: TelegramUser,
  editor: TelegramUser,
): Prisma.Prisma__UserClient<User, never, DefaultArgs> =>
  prisma.user.upsert({
    create: {
      authorId: editor.id,
      editorId: editor.id,
      firstName: user.first_name,
      id: user.id,
      languageCode: user.language_code ?? null,
      lastName: user.last_name ?? null,
      username: user.username ?? null,
    },
    update: {
      editorId: editor.id,
      firstName: user.first_name,
      languageCode: user.language_code ?? null,
      lastName: user.last_name ?? null,
      username: user.username ?? null,
    },
    where: { id: user.id },
  });
