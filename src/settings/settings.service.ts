import { Injectable, Logger } from "@nestjs/common";
import { ChatType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import i18next, { changeLanguage, t } from "i18next";
import { Command, Ctx, Next, On, Update } from "nestjs-telegraf";
import type { InlineKeyboardButton, InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";

import { AddingBotsAction } from "src/adding-bots/interfaces/action.interface";
import { DATE_FORMAT, PAGE_SIZE } from "src/app.constants";
import { ChannelMessageFilterAction } from "src/channel-message-filter/interfaces/action.interface";
import { CommandWithoutPayload } from "src/decorators/command-without-payload";
import { LanguageAction } from "src/language/interfaces/action.interface";
import type { UpsertedChat } from "src/prisma/interfaces/upserted-chat.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { ProfanityFilterAction } from "src/profanity-filter/interfaces/action.interface";
import { TimeZoneAction } from "src/time-zone/interfaces/action.interface";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, CommandCtx, MessageCtx } from "src/types/telegraf-context";
import { getDateLocale } from "src/utils/dates";
import {
  buildCbData,
  getChatHtmlLink,
  getErrorCode,
  getPagination,
  getUserHtmlLink,
  parseCbData,
} from "src/utils/telegraf";
import { VotebanAction } from "src/voteban/interfaces/action.interface";
import { WarningsAction } from "src/warnings/interfaces/action.interface";

import { SettingsAction } from "./interfaces/action.interface";
import { WithModifiedOptions } from "./interfaces/with-modified-options.interface";

@Update()
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  /**
   * Creates service
   * @param prismaService Database service
   */
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Handles callback query related to settings
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, skip } = parseCbData(ctx);
    switch (action) {
      case SettingsAction.CHATS:
      case SettingsAction.REFRESH:
        await this.renderChats(ctx, skip, true);
        break;
      case SettingsAction.FEATURES:
        await this.renderFeatures(ctx, chatId, skip);
        break;
      default:
        await next();
    }
  }

  /**
   * Shows settings message after /mychats command
   * @param ctx Text message context
   */
  @Command("mychats")
  @CommandWithoutPayload()
  public async myChatsCommand(@Ctx() ctx: CommandCtx): Promise<void> {
    if (ctx.chat.type === "private") {
      await this.renderChats(ctx, 0);
      return;
    }
    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.message.from);
    await changeLanguage(settings.language);
    const msg = t("common:commandForPrivateChat", { BOT_LINK: `tg:user?id=${ctx.botInfo.id.toString()}` });
    await ctx.reply(msg, { parse_mode: "HTML", reply_parameters: { message_id: ctx.message.message_id } });
  }

  /**
   * Prompts admin to make settings when adding the bot to a new chat
   * @param ctx Message context
   * @param next Function to continue processing
   */
  @On(["group_chat_created", "new_chat_members", "supergroup_chat_created"])
  public async promptSettings(@Ctx() ctx: MessageCtx, @Next() next: NextFunction): Promise<void> {
    const botId = ctx.botInfo.id;
    const { message } = ctx.update;
    const isBotAdded = "new_chat_members" in message && message.new_chat_members.some((m) => m.id === botId);
    const isChatCreated = "group_chat_created" in message || "supergroup_chat_created" in message;

    if (!isBotAdded && !isChatCreated) {
      await next();
      return;
    }

    this.logger.log(`The bot was added to a ${ctx.chat.type} chat`);

    const [chat, userChat] = await Promise.all([
      this.prismaService.upsertChatWithCache(ctx.chat, message.from),
      this.prismaService.chat.findUnique({
        select: { id: true, settings: { select: { language: true } } },
        where: { id: message.from.id },
      }),
    ]);

    const isUserAdmin = this.prismaService.isChatAdmin(chat, message.from.id, message.sender_chat?.id);

    if (isUserAdmin && userChat) {
      await changeLanguage(userChat.settings.language);
      await ctx.telegram.sendMessage(userChat.id, t("settings:invitation"));
      await this.renderFeatures(ctx, chat.id);
      this.logger.log("An invitation has been sent to the administrator to complete the settings");
    }

    await next();
  }

  /**
   * Gets back to features button
   * @param chatId Chat id
   * @returns Inline button
   */
  public getBackToFeaturesButton(chatId: number): InlineKeyboardButton[] {
    return [
      {
        callback_data: buildCbData({ action: SettingsAction.FEATURES, chatId }),
        text: `« ${t("settings:backToFeatures")}`,
      },
    ];
  }

  /**
   * Notifies user about successfully saved changes
   * @param ctx Callback context
   */
  public async notifyChangesSaved(ctx: CallbackCtx): Promise<void> {
    await ctx.answerCbQuery(t("settings:changesSaved"), { show_alert: true });
  }

  /**
   * Renders chats
   * @param ctx Callback or message context
   * @param skip Skip count
   * @param shouldAnswerCallback Answer callback query will be sent if true
   */
  public async renderChats(ctx: CallbackCtx | MessageCtx, skip = 0, shouldAnswerCallback?: boolean): Promise<void> {
    const { from } = typeof ctx.callbackQuery === "undefined" ? ctx.update.message : ctx.callbackQuery;
    const take = skip === 0 ? PAGE_SIZE - 1 : PAGE_SIZE;
    if (!ctx.chat || isNaN(skip)) {
      this.logger.error("Incorrect parameters to render chats");
      return;
    }

    const [[chats, count], dbChat] = await Promise.all([
      this.prismaService.$transaction([
        this.prismaService.chat.findMany({
          orderBy: { displayTitle: "asc" },
          select: { displayTitle: true, id: true },
          skip,
          take,
          where: { admins: { some: { id: from.id } } },
        }),
        this.prismaService.chat.count({ where: { admins: { some: { id: from.id } } } }),
      ]),
      this.prismaService.upsertChatWithCache(ctx.chat, from),
    ]);
    await changeLanguage(dbChat.settings.language);

    if (skip === 0) {
      chats.unshift(dbChat);
    }
    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        ...chats.map((c) => [
          { callback_data: buildCbData({ action: SettingsAction.FEATURES, chatId: c.id }), text: c.displayTitle },
        ]),
        getPagination({ action: SettingsAction.CHATS, count, skip, take }),
        [{ callback_data: buildCbData({ action: SettingsAction.REFRESH }), text: `↻ ${t("settings:refreshList")}` }],
      ],
    };
    const msg = [t("settings:selectChat"), t("settings:updateInfoHint")].join("\n\n");
    await (typeof ctx.callbackQuery === "undefined"
      ? ctx.reply(msg, { parse_mode: "HTML", reply_markup: replyMarkup })
      : Promise.all([
          shouldAnswerCallback && ctx.answerCbQuery(),
          // An expected error may happen if the message won't change during edit
          ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: replyMarkup }).catch(() => undefined),
        ]));
  }

  /**
   * Upserts chat by id and validates admin permissions for current user.
   * Redirects to chat list with alert if there is no enough permissions.
   * @param ctx Callback or message context
   * @param chatId Chat id
   * @returns True if validation is successfully passed
   */
  public async resolveChat(ctx: CallbackCtx | MessageCtx, chatId: number): Promise<UpsertedChat | undefined> {
    const { from } = typeof ctx.callbackQuery === "undefined" ? ctx.update.message : ctx.callbackQuery;
    try {
      const chat = await ctx.telegram.getChat(chatId);
      const dbChat = await this.prismaService.upsertChatWithCache(chat, from);
      if (this.prismaService.isChatAdmin(dbChat, from.id)) {
        return dbChat;
      }
    } catch (e) {
      const errorCode = getErrorCode(e);
      if (errorCode === 400 || errorCode === 403) {
        // Chat was deleted, remove it from the cache and database.
        await Promise.all([
          this.prismaService.deleteChatCache(chatId),
          this.prismaService.chatSettings.deleteMany({ where: { id: chatId } }),
        ]);
      }
    }

    if (ctx.callbackQuery) {
      await Promise.all([ctx.answerCbQuery(t("settings:forbidden"), { show_alert: true }), this.renderChats(ctx, 0)]);
    }
  }

  /**
   * Adds modified info to the text
   * @param text Text
   * @param options Options to get modified info
   * @returns Text with modified information if available
   */
  public withModifiedInfo(text: string, options: WithModifiedOptions): string {
    const { chat, settingName, timeZone } = options;
    const historyItem = chat.settingsHistory.find((h) => h.settingName === settingName);
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
   * Renders features
   * @param ctx Callback or message context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  private async renderFeatures(ctx: CallbackCtx | MessageCtx, chatId: number, skip = 0): Promise<void> {
    const { callbackQuery: cbQuery, chat, telegram, update } = ctx;
    const { from } = typeof cbQuery === "undefined" ? update.message : cbQuery;
    if (!chat || isNaN(chatId) || isNaN(skip)) {
      this.logger.error("Incorrect parameters to render features");
      return;
    }

    const destDbChat = cbQuery
      ? await this.prismaService.upsertChatWithCache(chat, from)
      : await this.resolveChat(ctx, from.id);
    if (!destDbChat) {
      throw new Error("Target chat is not defined to render features.");
    }
    await changeLanguage(destDbChat.settings.language);
    const dbChat = await this.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBotsButton: InlineKeyboardButton[] = [
      { callback_data: buildCbData({ action: AddingBotsAction.SETTINGS, chatId }), text: t("addingBots:featureName") },
    ];
    const channelMessageFilterButton: InlineKeyboardButton[] = [
      {
        callback_data: buildCbData({ action: ChannelMessageFilterAction.SETTINGS, chatId }),
        text: t("channelMessageFilter:featureName"),
      },
    ];
    const languageButton: InlineKeyboardButton[] = [
      { callback_data: buildCbData({ action: LanguageAction.SETTINGS, chatId }), text: t("language:featureName") },
    ];
    const profanityFilterButton: InlineKeyboardButton[] = [
      {
        callback_data: buildCbData({ action: ProfanityFilterAction.SETTINGS, chatId }),
        text: t("profanityFilter:featureName"),
      },
    ];
    const timeZoneButton: InlineKeyboardButton[] = [
      { callback_data: buildCbData({ action: TimeZoneAction.SETTINGS, chatId }), text: t("timeZone:featureName") },
    ];
    const votebanButton: InlineKeyboardButton[] = [
      { callback_data: buildCbData({ action: VotebanAction.SETTINGS, chatId }), text: t("voteban:featureName") },
    ];
    const warningsButton: InlineKeyboardButton[] = [
      { callback_data: buildCbData({ action: WarningsAction.SETTINGS, chatId }), text: t("warnings:featureName") },
    ];
    const allFeatures: Record<ChatType, InlineKeyboardButton[][]> = {
      [ChatType.CHANNEL]: [languageButton, timeZoneButton],
      [ChatType.GROUP]: [
        addingBotsButton,
        channelMessageFilterButton,
        languageButton,
        profanityFilterButton,
        timeZoneButton,
        votebanButton,
        warningsButton,
      ],
      [ChatType.PRIVATE]: [languageButton, timeZoneButton],
      [ChatType.SUPERGROUP]: [
        addingBotsButton,
        channelMessageFilterButton,
        languageButton,
        profanityFilterButton,
        timeZoneButton,
        votebanButton,
        warningsButton,
      ],
      [ChatType.UNKNOWN]: [],
    };
    const features = [...allFeatures[dbChat.type]].sort((a, b) => a[0]?.text.localeCompare(b[0]?.text));

    const chatLink = getChatHtmlLink(dbChat);
    const msg = t("settings:selectFeature", { CHAT: chatLink });
    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        ...features.slice(skip, skip + PAGE_SIZE),
        getPagination({ action: SettingsAction.FEATURES, chatId, count: features.length, skip }),
        [{ callback_data: buildCbData({ action: SettingsAction.CHATS }), text: `« ${t("settings:backToChats")}` }],
      ],
    };

    await Promise.all([
      cbQuery && ctx.answerCbQuery(),
      cbQuery && ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: replyMarkup }),
      !cbQuery && telegram.sendMessage(from.id, msg, { parse_mode: "HTML", reply_markup: replyMarkup }),
    ]);
  }
}
