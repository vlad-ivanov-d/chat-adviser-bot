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
import { cache } from "utils/cache";
import { getDateLocale } from "utils/dates";
import { getChatDisplayTitle, getUserDisplayName, getUserHtmlLink } from "utils/telegraf";

import { CHAT_CACHE_TIMEOUT } from "./database.constants";
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
   * Removes cache for upsert chat method
   * @param chatId Chat id
   */
  public removeUpsertChatCache(chatId: number): void {
    const cacheKey = this.getChatCacheKey(chatId);
    cache.forEach((key) => {
      if (key.startsWith(cacheKey)) {
        cache.removeItem(key);
      }
    });
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
   * Shutdowns database module
   */
  public async shutdown(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Gets the chat from the database. The chat will be created if it's not exists.
   * @param chat Telegram chat or chat id
   * @param editor Telegram user who makes upsert
   * @returns Chat
   */
  public async upsertChat(chat: Chat, editor: TelegramUser): Promise<UpsertedChat> {
    const cacheKey = this.getChatCacheKey(chat.id, editor.id);
    const cachedChat = cache.getItem<UpsertedChat>(cacheKey);
    if (cachedChat) {
      return cachedChat;
    }

    const { botInfo, telegram } = this.bot;
    const [admins, membersCount] = await Promise.all([
      // An expected error may happen if administrators are hidden
      chat.type === "private" ? [] : telegram.getChatAdministrators(chat.id).catch(() => []),
      telegram.getChatMembersCount(chat.id),
    ]);

    const adminIds = admins.map((a) => ({ id: a.user.id }));
    const update = {
      admins: { set: adminIds },
      displayTitle: getChatDisplayTitle(chat),
      editorId: editor.id,
      firstName: "first_name" in chat ? chat.first_name : null,
      lastName: "last_name" in chat ? chat.last_name ?? null : null,
      membersCount,
      title: "title" in chat ? chat.title : null,
      type: this.resolveChatType(chat.type),
      username: "username" in chat ? chat.username ?? null : null,
    };

    const transaction = await this.$transaction([
      ...[editor, ...admins.map((a) => a.user)]
        .filter((u, i, arr) => arr.findIndex((au) => au.id === u.id) === i) // Trim duplicates
        .map((u) => this.upsertUser(u, editor)),
      this.chat.upsert({
        create: {
          ...update,
          ...(chat.type === "group" || chat.type === "supergroup"
            ? {
                addingBots: AddingBotsRule.RESTRICT,
                hasWarnings: true,
                messagesOnBehalfOfChannels: MessagesOnBehalfOfChannelsRule.FILTER,
                profanityFilter: ProfanityFilterRule.FILTER,
              }
            : {}),
          admins: { connect: adminIds },
          authorId: editor.id,
          id: chat.id,
          language: this.resolveLanguage(editor.language_code),
          timeZone: this.resolveTimeZone(editor.language_code),
        },
        include: { admins: true, chatSettingsHistory: { include: { editor: true } } },
        update,
        where: { id: chat.id },
      }),
    ]);

    const dbChat = transaction[transaction.length - 1];
    if (!("admins" in dbChat)) {
      throw new Error("Something went wrong during chat upsertion.");
    }

    // Patch display title of the chat with the bot
    const patchedChat =
      botInfo && chat.id === editor.id
        ? { ...dbChat, displayTitle: getUserDisplayName(botInfo, "full"), username: botInfo.username }
        : dbChat;
    cache.setItem(cacheKey, patchedChat, CHAT_CACHE_TIMEOUT);
    return patchedChat;
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
    this.removeUpsertChatCache(chatId);
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
    const update = {
      editorId: editor.id,
      firstName: "first_name" in chat ? chat.first_name : null,
      lastName: "last_name" in chat ? chat.last_name ?? null : null,
      title: "title" in chat ? chat.title : null,
      type: this.resolveChatType(chat.type),
      username: "username" in chat ? chat.username ?? null : null,
    };
    const [, senderChat] = await this.$transaction([
      this.upsertUser(editor, editor),
      this.senderChat.upsert({
        create: { ...update, authorId: editor.id, id: chat.id },
        select: { id: true },
        update,
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
    const update = {
      editorId: editor.id,
      firstName: user.first_name,
      languageCode: user.language_code ?? null,
      lastName: user.last_name ?? null,
      username: user.username ?? null,
    };
    return this.user.upsert({
      create: { ...update, authorId: editor.id, id: user.id },
      update,
      where: { id: user.id },
    });
  }

  /**
   * Gets cache key for the chat
   * @param chatId Chat id
   * @param editorId Editor id
   * @returns Cache key
   */
  private getChatCacheKey(chatId: number, editorId?: number): string {
    return `database-upsert-chat-${chatId}` + (typeof editorId === "undefined" ? "" : `-${editorId}`);
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
   * @param languageCode Telegram language code
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
