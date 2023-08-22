import { ChatSettingName, LanguageCode, Prisma, User } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { formatInTimeZone } from "date-fns-tz";
import { t } from "i18next";
import { prisma } from "index";
import { Chat as TelegramChat, User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { UpsertedChat } from "types/chat";
import { bot } from "utils/bot";
import { DATE_FORMAT, DATE_LOCALES, GROUP_ANONYMOUS_BOT_ID } from "utils/consts";
import { getUserHtmlLink, getUserTitle } from "utils/telegram";

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
 * @param options.settingName Setting name
 * @param options.upsertedChat Upserted chat
 * @returns Text with modified information if available
 */
export const joinModifiedInfo = (
  text: string,
  options: { lng: LanguageCode; settingName: ChatSettingName; upsertedChat: UpsertedChat },
): string => {
  const { lng, settingName, upsertedChat } = options;
  const { chatSettingsHistory, timeZone } = upsertedChat;
  const historyItem = chatSettingsHistory.find((s) => s.settingName === settingName);
  return [
    text,
    historyItem
      ? t("settings:modified", {
          DATE: formatInTimeZone(historyItem.updatedAt, timeZone, DATE_FORMAT, { locale: DATE_LOCALES[lng] }),
          USER: getUserHtmlLink(historyItem.editor, upsertedChat),
          lng,
        })
      : "",
  ]
    .filter((p) => p)
    .join("\n");
};

/**
 * Checks the user is a chat admin
 * @param chat Upserted chat
 * @param userId User id
 * @returns True if admin
 */
export const isChatAdmin = (chat: UpsertedChat, userId: number): boolean => {
  if (userId === GROUP_ANONYMOUS_BOT_ID) return true;
  if (userId === chat.id) return true; // Private chat with bot
  return chat.admins.some((a) => a.id === userId);
};

/**
 * Gets chat from database. Chat will be created if it's not exists.
 * @param chat Telegram chat or chat id
 * @param editor Telegram user who makes upsert
 * @returns Upserted chat
 */
export const upsertChat = async (chat: TelegramChat | number, editor: TelegramUser): Promise<UpsertedChat> => {
  const chatId = typeof chat === "number" ? chat : chat.id;
  const isPrivate = typeof chat === "number" ? undefined : chat.type === "private";
  const [_chat, admins, membersCount] = await Promise.all([
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
      .map((u) => upsertUser(u, editor)),
    prisma.chat.upsert({
      create: {
        admins: { connect: admins.map((a) => ({ id: a.user.id })) },
        authorId: editor.id,
        editorId: editor.id,
        id: chatId,
        language: resolveLanguage(editor.language_code),
        membersCount: membersCount ?? 0,
        timeZone: resolveTimeZone(editor.language_code),
        title: _chat?.type === "private" ? getUserTitle(editor, _chat) : _chat?.title ?? "",
        type: _chat?.type ?? "private",
      },
      include: { admins: true, chatSettingsHistory: { include: { editor: true } } },
      update: {
        admins: { set: admins.map((a) => ({ id: a.user.id })) },
        editorId: editor.id,
        membersCount,
        title: _chat?.type === "private" ? getUserTitle(editor, _chat) : _chat?.title,
        type: _chat?.type,
      },
      where: { id: chatId },
    }),
  ]);
  const upsertedChat = transaction.pop() as UpsertedChat;
  return {
    ...upsertedChat,
    // Mutate bot private chat title
    title: upsertedChat.id === editor.id && bot.botInfo ? getUserTitle(bot.botInfo, _chat) : upsertedChat.title,
  };
};

/**
 * Upserts chat settings history
 * @param chatId Chat id
 * @param editorId User id
 * @param settingName Chat setting name
 * @returns Chat settings history id
 */
export const upsertChatSettingsHistory = (
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
export const upsertUser = (
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
