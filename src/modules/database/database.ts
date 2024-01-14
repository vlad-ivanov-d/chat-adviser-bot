import {
  AddingBotsRule,
  type ChatSettingName,
  ChatType,
  LanguageCode,
  MessagesOnBehalfOfChannelsRule,
  type Prisma,
  PrismaClient,
  ProfanityFilterRule,
  type User,
} from "@prisma/client";
import { DATE_FORMAT } from "constants/dates";
import { formatInTimeZone } from "date-fns-tz";
import i18next, { t } from "i18next";
import type { Telegraf } from "telegraf";
import type { Chat, User as TelegramUser } from "telegraf/typings/core/types/typegram";
import type { BasicModule } from "types/basicModule";
import { getDateLocale } from "utils/dates";
import { getChatDisplayTitle, getUserDisplayName, getUserHtmlLink } from "utils/telegraf";

import type { UpsertedChat } from "./database.types";

export class Database extends PrismaClient implements BasicModule {
  /**
   * Creates database module
   * @param bot Telegraf bot instance
   */
  public constructor(private readonly bot: Telegraf) {
    super();
  }

  /**
   * Initiates database module
   */
  public async init(): Promise<void> {
    await this.$connect();
  }

  /**
   * Checks the user is a chat admin
   * @param chat Chat
   * @param userId User id
   * @param senderChatId Sender chat id. A message can be send on behalf of current chat.
   * @returns True if admin
   */
  public isChatAdmin(chat: UpsertedChat, userId: number, senderChatId?: number): boolean {
    return (
      userId === chat.id || // Private chat has the same id as a user
      senderChatId === chat.id || // A message can be send on behalf of current chat
      chat.admins.some((a) => a.id === userId) // Check admin list. IMPORTANT: other bots won't be in this array.
    );
  }

  /**
   * Checks if chat exists in database
   * @param chatId Chat id
   * @returns True if chat exists
   */
  public async isChatExists(chatId: number): Promise<boolean> {
    const chat = await this.chat.findUnique({ select: { id: true }, where: { id: chatId } });
    return chat !== null;
  }

  /**
   * Adds modified info to the text
   * @param text Text
   * @param settingName Setting name
   * @param chat Chat
   * @returns Text with modified information if available
   */
  public joinModifiedInfo(text: string, settingName: ChatSettingName, chat: UpsertedChat): string {
    const { chatSettingsHistory, timeZone } = chat;
    const historyItem = chatSettingsHistory.find((s) => s.settingName === settingName);
    const locale = getDateLocale(i18next.language);
    return [
      text,
      historyItem
        ? t("settings:modified", {
            DATE: formatInTimeZone(historyItem.updatedAt, timeZone, DATE_FORMAT, { locale }),
            USER: getUserHtmlLink(historyItem.editor),
          })
        : "",
    ]
      .filter((p) => p)
      .join("\n");
  }

  /**
   * Shutdowns database module
   */
  public async shutdown(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Resolves supported language code
   * @param languageCode Language code
   * @returns Language code which is supported by the bot
   */
  public resolveLanguage(languageCode: string | undefined): LanguageCode {
    switch (languageCode) {
      case "ru":
      case LanguageCode.RU:
        return LanguageCode.RU;
      default:
        return LanguageCode.EN;
    }
  }

  /**
   * Gets the chat from the database. The chat will be created if it's not exists.
   * @param chat Telegram chat or chat id
   * @param editor Telegram user who makes upsert
   * @returns Chat
   */
  public async upsertChat(chat: Chat, editor: TelegramUser): Promise<UpsertedChat> {
    const [admins, membersCount] = await Promise.all([
      // An expected error may happen if administrators are hidden
      chat.type === "private" ? [] : this.bot.telegram.getChatAdministrators(chat.id).catch(() => []),
      this.bot.telegram.getChatMembersCount(chat.id),
    ]);

    const displayTitle = getChatDisplayTitle(chat);
    const firstName = "first_name" in chat ? chat.first_name : null;
    const isGroupChat = chat.type === "group" || chat.type === "supergroup";
    const lastName = "last_name" in chat ? chat.last_name ?? null : null;
    const title = "title" in chat ? chat.title : null;
    const username = "username" in chat ? chat.username ?? null : null;

    const transaction = await this.$transaction([
      ...[editor, ...admins.map((a) => a.user)]
        .filter((u, i, arr) => arr.findIndex((au) => au.id === u.id) === i) // Trim duplicates
        .map((u) => this.upsertUser(u, editor)),
      this.chat.upsert({
        create: {
          addingBots: isGroupChat ? AddingBotsRule.RESTRICT : undefined,
          admins: { connect: admins.map((a) => ({ id: a.user.id })) },
          authorId: editor.id,
          displayTitle,
          editorId: editor.id,
          firstName,
          id: chat.id,
          language: this.resolveLanguage(editor.language_code),
          lastName,
          membersCount,
          messagesOnBehalfOfChannels: isGroupChat ? MessagesOnBehalfOfChannelsRule.FILTER : undefined,
          profanityFilter: isGroupChat ? ProfanityFilterRule.FILTER : undefined,
          timeZone: this.resolveTimeZone(editor.language_code),
          title,
          type: this.resolveChatType(chat.type),
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
          type: this.resolveChatType(chat.type),
          username,
        },
        where: { id: chat.id },
      }),
    ]);

    const upsertedChat = transaction[transaction.length - 1];
    if (!("admins" in upsertedChat)) {
      throw new Error("Something went wrong during chat upsertion.");
    }

    return this.bot.botInfo && chat.id === editor.id
      ? // Patch display title of the chat with the bot
        {
          ...upsertedChat,
          displayTitle: getUserDisplayName(this.bot.botInfo, "full"),
          username: this.bot.botInfo.username,
        }
      : upsertedChat;
  }

  /**
   * Upserts chat settings history
   * @param chatId Chat id
   * @param editorId User id
   * @param settingName Chat setting name
   * @returns Chat settings history id
   */
  public upsertChatSettingsHistory(
    chatId: number,
    editorId: number,
    settingName: ChatSettingName,
  ): Prisma.Prisma__ChatSettingsHistoryClient<{ id: bigint }> {
    return this.chatSettingsHistory.upsert({
      create: { authorId: editorId, chatId, editorId, settingName },
      select: { id: true },
      update: { editorId },
      where: { chatId_settingName: { chatId, settingName } },
    });
  }

  /**
   * Creates or updates (if still not exist) sender chat in database.
   * @param chat Telegram chat
   * @param editor Telegram user who makes upsert
   * @returns Sender chat id
   */
  public async upsertSenderChat(chat: Chat, editor: TelegramUser): Promise<number> {
    const firstName = "first_name" in chat ? chat.first_name : null;
    const lastName = "last_name" in chat ? chat.last_name ?? null : null;
    const title = "title" in chat ? chat.title : null;
    const username = "username" in chat ? chat.username ?? null : null;
    const [, senderChat] = await this.$transaction([
      this.upsertUser(editor, editor),
      this.senderChat.upsert({
        create: {
          authorId: editor.id,
          editorId: editor.id,
          firstName,
          id: chat.id,
          lastName,
          title,
          type: this.resolveChatType(chat.type),
          username,
        },
        select: { id: true },
        update: { editorId: editor.id, firstName, lastName, title, type: this.resolveChatType(chat.type), username },
        where: { id: chat.id },
      }),
    ]);
    return senderChat.id;
  }

  /**
   * Gets the user from database. The user will be created if it's not exists.
   * @param user Telegram user
   * @param editor Telegram user who makes upsert
   * @returns User
   */
  public upsertUser(user: TelegramUser, editor: TelegramUser): Prisma.Prisma__UserClient<User> {
    return this.user.upsert({
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
  }

  /**
   * Resolves chat type based on Telegram chat type
   * @param chatType Telegram chat type
   * @returns Chat type which is supported by the bot
   */
  private resolveChatType(chatType: Chat["type"]): ChatType {
    switch (chatType) {
      case "channel":
        return ChatType.CHANNEL;
      case "group":
        return ChatType.GROUP;
      case "private":
        return ChatType.PRIVATE;
      case "supergroup":
        return ChatType.SUPERGROUP;
      default:
        return ChatType.UNKNOWN;
    }
  }

  /**
   * Resolves time zone based on Telegram language code
   * @param languageCode Telegram lanugage code
   * @returns Time zone identifier
   */
  private resolveTimeZone(languageCode: string | undefined): string {
    switch (languageCode) {
      case "ru":
        return "Europe/Moscow";
      case "en":
      default:
        return "Etc/UTC";
    }
  }
}
