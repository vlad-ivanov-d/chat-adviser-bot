import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import {
  AddingBotsRule,
  ChannelMessageFilterRule,
  type ChatSettingName,
  ChatType,
  LanguageCode,
  type Prisma,
  PrismaClient,
  ProfanityFilterRule,
  type User,
} from "@prisma/client";
import { Cache as CacheManager } from "cache-manager";
import { InjectBot } from "nestjs-telegraf";
import { Telegraf } from "telegraf";
import type { Chat, User as TelegramUser } from "telegraf/typings/core/types/typegram";

import { getChatDisplayTitle, getUserDisplayName } from "src/utils/telegraf";

import type { UpsertedChat } from "./interfaces/upserted-chat.interface";
import { CHAT_CACHE_TTL, CHAT_MEMBERS_COUNT_CACHE_TTL } from "./prisma.constants";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Creates service
   * @param bot Telegram bot instance
   * @param cacheManager Cache manager
   */
  public constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject(CACHE_MANAGER) private cacheManager: CacheManager,
  ) {
    super();
  }

  /**
   * Deletes cache for upsert chat method
   * @param chatId Chat id
   */
  public async deleteChatCache(chatId: number): Promise<void> {
    const cacheKey = this.getChatCacheKey(chatId);
    await this.cacheManager.del(cacheKey);
  }

  /**
   * Lifecycle event called after a termination signal (e.g., SIGTERM) has been received.
   */
  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
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
   * Gets the chat from the database. The chat will be created if it does not exist.
   * The result of this request will be cached for 10 seconds.
   * @param chat Telegram chat
   * @param editor Telegram user who makes upsert
   * @returns Chat
   */
  public async upsertChatWithCache(chat: Chat, editor: TelegramUser): Promise<UpsertedChat> {
    const cacheKey = this.getChatCacheKey(chat.id);
    return this.cacheManager.wrap(cacheKey, () => this.upsertChat(chat, editor), CHAT_CACHE_TTL);
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
  ): Prisma.Prisma__ChatSettingsHistoryClient<{ id: string }> {
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
   * @returns Cache key
   */
  private getChatCacheKey(chatId: number): string {
    return `upserted-chat-${chatId.toString()}`;
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

  /**
   * Gets the chat from the database. The chat will be created if it does not exists.
   * @param chat Telegram chat
   * @param editor Telegram user who makes upsert
   * @returns Chat
   */
  private async upsertChat(chat: Chat, editor: TelegramUser): Promise<UpsertedChat> {
    const { botInfo, telegram } = this.bot;
    const [admins, membersCount] =
      chat.type === "private"
        ? [[], 2]
        : await Promise.all([
            telegram.getChatAdministrators(chat.id).catch((e: unknown) => {
              // An expected error may happen if administrators are hidden
              this.logger.error(e);
              return [];
            }),
            this.cacheManager.wrap(
              `chat-${chat.id.toString()}-members-count`,
              () => telegram.getChatMembersCount(chat.id),
              CHAT_MEMBERS_COUNT_CACHE_TTL,
            ),
          ]);

    await this.$transaction(
      [editor, ...admins.map((a) => a.user)]
        .filter((u, i, arr) => arr.findIndex((au) => au.id === u.id) === i) // Trim duplicates
        .map((u) => this.upsertUser(u, editor)),
    );

    const adminIds = admins.map((a) => ({ id: a.user.id }));
    const isChatWithBot = !!botInfo && chat.id === editor.id;
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
    const upsertArgs = {
      create: { ...update, admins: { connect: adminIds }, authorId: editor.id, id: chat.id, settingsId: chat.id },
      include: { admins: true, settings: true, settingsHistory: { include: { editor: true } } },
      update,
      where: { id: chat.id },
    };

    const settings = await this.chatSettings.findUnique({ select: { id: true }, where: { id: chat.id } });
    const [, upsertedChat] = settings
      ? await Promise.all([undefined, this.chat.upsert(upsertArgs)])
      : await this.$transaction([this.upsertChatSettings(chat, editor), this.chat.upsert(upsertArgs)]);
    return {
      ...upsertedChat,
      // Patch display title and username for the chat with the bot
      displayTitle: isChatWithBot ? getUserDisplayName(botInfo, "full") : upsertedChat.displayTitle,
      username: isChatWithBot ? botInfo.username : upsertedChat.username,
    };
  }

  /**
   * Upserts chat settings
   * @param chat Telegram chat
   * @param editor Telegram user who makes upsert
   * @returns Chat settings
   */
  private upsertChatSettings(chat: Chat, editor: TelegramUser): Prisma.Prisma__ChatSettingsClient<{ id: number }> {
    const isGroupChat = chat.type === "group" || chat.type === "supergroup";
    return this.chatSettings.upsert({
      create: {
        addingBots: isGroupChat ? AddingBotsRule.RESTRICT : undefined,
        authorId: editor.id,
        channelMessageFilter: isGroupChat ? ChannelMessageFilterRule.FILTER : undefined,
        editorId: editor.id,
        hasWarnings: isGroupChat || undefined,
        id: chat.id,
        language: this.resolveLanguage(editor.language_code),
        profanityFilter: isGroupChat ? ProfanityFilterRule.FILTER : undefined,
        timeZone: this.resolveTimeZone(editor.language_code),
      },
      select: { id: true },
      update: { editorId: editor.id },
      where: { id: chat.id },
    });
  }
}
