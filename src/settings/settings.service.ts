import { Injectable } from "@nestjs/common";
import { ChatType } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Ctx, Hears, Next, On, Update } from "nestjs-telegraf";
import { AddingBotsAction } from "src/adding-bots/interfaces/action.interface";
import { PAGE_SIZE } from "src/app.constants";
import { ChannelMessageFilterAction } from "src/channel-message-filter/interfaces/action.interface";
import { LanguageAction } from "src/language/interfaces/action.interface";
import type { UpsertedChat } from "src/prisma/interfaces/upserted-chat.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { ProfanityFilterAction } from "src/profanity-filter/interfaces/action.interface";
import { TimeZoneAction } from "src/time-zone/interfaces/action.interface";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, MessageCtx, type TextMessageCtx } from "src/types/telegraf-context";
import { getCallbackQueryParams, getChatHtmlLink, getErrorCode, getPagination } from "src/utils/telegraf";
import { VotebanAction } from "src/voteban/interfaces/action.interface";
import { WarningsAction } from "src/warnings/interfaces/action.interface";
import type { InlineKeyboardButton, InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";

import { SettingsAction } from "./interfaces/action.interface";

@Update()
@Injectable()
export class SettingsService {
  /**
   * Creates settings service
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
    const { action, chatId, skip } = getCallbackQueryParams(ctx);
    switch (action) {
      case SettingsAction.CHATS:
      case SettingsAction.REFRESH:
        await this.renderChats(ctx, skip);
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
  @Hears("/mychats")
  public async myChatsCommand(@Ctx() ctx: TextMessageCtx): Promise<void> {
    if (ctx.chat.type !== "private") {
      const { language } = await this.prismaService.upsertChat(ctx.chat, ctx.message.from);
      await changeLanguage(language);
      const msg = t("common:commandForPrivateChat", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}` });
      await ctx.reply(msg, { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id });
      return;
    }
    await this.renderChats(ctx, 0);
  }

  /**
   * Prompts admin to make settings when adding the bot to a new chat
   * @param ctx Message context
   * @param next Function to continue processing
   */
  @On(["group_chat_created", "new_chat_members", "supergroup_chat_created"])
  public async promptSettings(@Ctx() ctx: MessageCtx, @Next() next: NextFunction): Promise<void> {
    const botId = ctx.botInfo.id;
    const { message: msg } = ctx.update;

    const [chat, userChat] = await Promise.all([
      this.prismaService.upsertChat(ctx.chat, msg.from),
      this.prismaService.chat.findUnique({ select: { id: true, language: true }, where: { id: msg.from.id } }),
    ]);

    const isBotAdded = "new_chat_members" in msg && msg.new_chat_members.some((m) => m.id === botId);
    const isChatCreated = "group_chat_created" in msg || "supergroup_chat_created" in msg;
    const isUserAdmin = this.prismaService.isChatAdmin(chat, msg.from.id, msg.sender_chat?.id);

    if (userChat && isUserAdmin && (isBotAdded || isChatCreated)) {
      await changeLanguage(userChat.language);
      await ctx.telegram.sendMessage(userChat.id, t("settings:invitation"));
      await this.renderFeatures(ctx, chat.id);
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
      { callback_data: `${SettingsAction.FEATURES}?chatId=${chatId}`, text: `« ${t("settings:backToFeatures")}` },
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
   * Upserts chat by id and validates admin permissions for current user.
   * Redirects to chat list with alert if there is no enough permissions.
   * @param ctx Callback or message context
   * @param chatId Chat id
   * @returns True if validation is successfully passed
   */
  public async resolveChat(ctx: CallbackCtx | MessageCtx, chatId: number): Promise<UpsertedChat | undefined> {
    const from = "message" in ctx.update ? ctx.update.message.from : ctx.callbackQuery?.from;
    if (!from) {
      throw new Error("User is not defined to resolve database chat.");
    }

    try {
      const chat = await ctx.telegram.getChat(chatId);
      const dbChat = await this.prismaService.upsertChat(chat, from);
      if (this.prismaService.isChatAdmin(dbChat, from.id)) {
        return dbChat;
      }
    } catch (e) {
      const errorCode = getErrorCode(e);
      if (errorCode === 400 || errorCode === 403) {
        // Chat was deleted, remove it from the cache and database.
        this.prismaService.removeUpsertChatCache(chatId);
        await this.prismaService.chat.deleteMany({ where: { id: chatId } });
      }
    }

    if (ctx.callbackQuery) {
      await Promise.all([ctx.answerCbQuery(t("settings:forbidden"), { show_alert: true }), this.renderChats(ctx, 0)]);
    }
  }

  /**
   * Renders chats
   * @param ctx Callback or message context
   * @param skip Skip count
   */
  private async renderChats(ctx: CallbackCtx | MessageCtx, skip = 0): Promise<void> {
    const from = ctx.callbackQuery?.from ?? ctx.message?.from;
    const take = skip === 0 ? PAGE_SIZE - 1 : PAGE_SIZE;
    if (!from) {
      throw new Error("User is not defined to render chats.");
    }
    if (!ctx.chat) {
      throw new Error("Chat is not defined to render chats.");
    }
    if (isNaN(skip)) {
      throw new Error('Parameter "skip" is not correct to render chats.');
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
      this.prismaService.upsertChat(ctx.chat, from),
    ]);
    await changeLanguage(dbChat.language);

    if (skip === 0) {
      chats.unshift(dbChat);
    }
    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        ...chats.map((c) => [{ callback_data: `${SettingsAction.FEATURES}?chatId=${c.id}`, text: c.displayTitle }]),
        getPagination(SettingsAction.CHATS, { count, skip, take }),
        [{ callback_data: SettingsAction.REFRESH, text: `↻ ${t("settings:refreshList")}` }],
      ],
    };
    const msg = [t("settings:selectChat"), t("settings:updateInfoHint")].join("\n\n");
    await (typeof ctx.callbackQuery === "undefined"
      ? ctx.reply(msg, { parse_mode: "HTML", reply_markup: replyMarkup })
      : Promise.all([
          ctx.answerCbQuery(),
          // An expected error may happen if the message won't change during edit
          ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: replyMarkup }).catch(() => undefined),
        ]));
  }

  /**
   * Renders features
   * @param ctx Callback or message context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  private async renderFeatures(ctx: CallbackCtx | MessageCtx, chatId: number, skip = 0): Promise<void> {
    const { callbackQuery: cbQuery, chat, telegram, update } = ctx;
    const from = "message" in update ? update.message.from : cbQuery?.from;
    if (!from) {
      throw new Error("User is not defined to render features.");
    }
    if (!chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render features.");
    }
    if (isNaN(skip)) {
      throw new Error('Parameter "skip" is not correct to render features.');
    }

    const destDbChat = await (cbQuery ? this.prismaService.upsertChat(chat, from) : this.resolveChat(ctx, from.id));
    if (!destDbChat) {
      throw new Error("Target chat is not defined to render features.");
    }
    await changeLanguage(destDbChat.language);
    const dbChat = await this.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBotsButton: InlineKeyboardButton[] = [
      { callback_data: `${AddingBotsAction.SETTINGS}?chatId=${chatId}`, text: t("addingBots:featureName") },
    ];
    const channelMessageFilterButton: InlineKeyboardButton[] = [
      {
        callback_data: `${ChannelMessageFilterAction.SETTINGS}?chatId=${chatId}`,
        text: t("channelMessageFilter:featureName"),
      },
    ];
    const languageButton: InlineKeyboardButton[] = [
      { callback_data: `${LanguageAction.SETTINGS}?chatId=${chatId}`, text: t("language:featureName") },
    ];
    const profanityFilterButton: InlineKeyboardButton[] = [
      { callback_data: `${ProfanityFilterAction.SETTINGS}?chatId=${chatId}`, text: t("profanityFilter:featureName") },
    ];
    const timeZoneButton: InlineKeyboardButton[] = [
      { callback_data: `${TimeZoneAction.SETTINGS}?chatId=${chatId}`, text: t("timeZone:featureName") },
    ];
    const votebanButton: InlineKeyboardButton[] = [
      { callback_data: `${VotebanAction.SETTINGS}?chatId=${chatId}`, text: t("voteban:featureName") },
    ];
    const warningsButton: InlineKeyboardButton[] = [
      { callback_data: `${WarningsAction.SETTINGS}?chatId=${chatId}`, text: t("warnings:featureName") },
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
        getPagination(`${SettingsAction.FEATURES}?chatId=${chatId}`, { count: features.length, skip, take: PAGE_SIZE }),
        [{ callback_data: SettingsAction.CHATS, text: `« ${t("settings:backToChats")}` }],
      ],
    };

    await Promise.all([
      cbQuery && ctx.answerCbQuery(),
      cbQuery && ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: replyMarkup }),
      !cbQuery && telegram.sendMessage(from.id, msg, { parse_mode: "HTML", reply_markup: replyMarkup }),
    ]);
  }
}
