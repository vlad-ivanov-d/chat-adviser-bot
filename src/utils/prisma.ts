import { ChatSettingName, LanguageCode, Prisma, PrismaClient, User } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { formatInTimeZone } from "date-fns-tz";
import { t } from "i18next";
import { Chat as TelegramChat, User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { PrismaChat } from "types/prismaChat";
import { DATE_FORMAT, DATE_LOCALES, GROUP_ANONYMOUS_BOT_ID } from "utils/consts";
import { bot, getUserHtmlLink, getUserTitle } from "utils/telegraf";

/**
 * Database client
 */
export const prisma = new PrismaClient();

/**
 * Resolves language based on Telegram language code
 * @param languageCode Telegram lanugage code
 * @returns Language
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
 * Converts Telegram user to Prisma user
 * @param user Telegram user
 * @returns Prisma user
 */
const telegramToPrismaUser = (user: TelegramUser): User => ({
  authorId: user.id,
  createdAt: new Date(),
  editorId: user.id,
  firstName: user.first_name,
  id: user.id,
  lastName: user.last_name ?? null,
  updatedAt: new Date(),
  username: user.username ?? null,
});

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
          USER: getUserHtmlLink(historyItem.editor, prismaChat),
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
 * @returns True if admin
 */
export const isPrismaChatAdmin = (prismaChat: PrismaChat, userId: number): boolean => {
  if (userId === GROUP_ANONYMOUS_BOT_ID) {
    return true;
  }
  if (userId === prismaChat.id) {
    return true; // Private chat with bot
  }
  return prismaChat.admins.some((a) => a.id === userId);
};

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
export const upsertPrismaChat = async (chat: TelegramChat | number, editor: TelegramUser): Promise<PrismaChat> => {
  const chatId = typeof chat === "number" ? chat : chat.id;
  const isPrivate = typeof chat === "number" ? undefined : chat.type === "private";
  const [resolvedChat, admins, membersCount] = await Promise.all([
    // An expected error may happen when bot was removed from the chat
    typeof chat === "number" ? bot.telegram.getChat(chatId).catch(() => undefined) : chat,
    // An expected error may happen when bot was removed from the chat or chat is private
    isPrivate ? [] : bot.telegram.getChatAdministrators(chatId).catch(() => []),
    // An expected error may happen when bot was removed from the chat
    bot.telegram.getChatMembersCount(chatId).catch(() => undefined),
  ]);
  const transaction = await prisma.$transaction([
    ...[editor, ...admins.map((a) => a.user)]
      .filter((u, i, arr) => arr.indexOf(u) === i) // Trim duplicates
      .map((u) => upsertPrismaUser(u, editor)),
    prisma.chat.upsert({
      create: {
        admins: { connect: admins.map((a) => ({ id: a.user.id })) },
        authorId: editor.id,
        editorId: editor.id,
        id: chatId,
        language: resolveLanguage(editor.language_code),
        membersCount: membersCount ?? 0,
        timeZone: resolveTimeZone(editor.language_code),
        title: resolvedChat?.type === "private" ? getUserTitle(editor, resolvedChat) : resolvedChat?.title ?? "",
        type: resolvedChat?.type ?? "private",
      },
      include: { admins: true, chatSettingsHistory: { include: { editor: true } } },
      update: {
        admins: { set: admins.map((a) => ({ id: a.user.id })) },
        editorId: editor.id,
        membersCount,
        title: resolvedChat?.type === "private" ? getUserTitle(editor, resolvedChat) : resolvedChat?.title,
        type: resolvedChat?.type,
      },
      where: { id: chatId },
    }),
  ]);
  const prismaChat = transaction.pop() as PrismaChat;
  // Mutate bot private chat title
  const title = prismaChat.id === editor.id && bot.botInfo ? getUserTitle(bot.botInfo, resolvedChat) : prismaChat.title;
  return { ...prismaChat, title };
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
    create: { ...telegramToPrismaUser(user), authorId: editor.id, editorId: editor.id },
    update: {
      editorId: editor.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
    },
    where: { id: user.id },
  });
