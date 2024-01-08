import { ChatType } from "@prisma/client";
import type { InlineKeyboardMarkup } from "@telegraf/types";
import { PAGE_SIZE } from "constants/pagination";
import { changeLanguage, t } from "i18next";
import { AddingBotsAction } from "modules/addingBots/addingBots.types";
import type { Database, PrismaChat } from "modules/database";
import { LanguageAction } from "modules/language/language.types";
import { MessagesOnBehalfOfChannelsAction } from "modules/messagesOnBehalfOfChannels/messagesOnBehalfOfChannels.types";
import { ProfanityFilterAction } from "modules/profanityFilter/profanityFilter.types";
import { TimeZoneAction } from "modules/timeZone/timeZone.types";
import { VotebanAction } from "modules/voteban/voteban.types";
import type { Telegraf } from "telegraf";
import { callbackQuery, message } from "telegraf/filters";
import type { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import type { CallbackCtx, MessageCtx, TextMessageCtx } from "types/telegrafContext";
import { getCallbackQueryParams, getChatHtmlLink, getErrorCode, getPagination } from "utils/telegraf";

import { SettingsAction } from "./settings.types";

export class Settings {
  /**
   * Creates settings module
   * @param bot Telegraf bot instance
   * @param database Database
   */
  public constructor(
    private readonly bot: Telegraf,
    private readonly database: Database,
  ) {}

  /**
   * Initiates settings module
   */
  public init(): void {
    this.bot.hears("/mychats", (ctx) => this.myChatsCommand(ctx));
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
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
    });
    this.bot.on(message("group_chat_created"), (ctx, next) => this.promptSettings(ctx, next));
    this.bot.on(message("new_chat_members"), (ctx, next) => this.promptSettings(ctx, next));
    this.bot.on(message("supergroup_chat_created"), (ctx, next) => this.promptSettings(ctx, next));
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
  public async resolvePrismaChat(ctx: CallbackCtx | MessageCtx, chatId: number): Promise<PrismaChat | undefined> {
    const from = "message" in ctx.update ? ctx.update.message.from : ctx.callbackQuery?.from;
    if (!from) {
      throw new Error("User is not defined to resolve prisma chat.");
    }

    try {
      const chat = await ctx.telegram.getChat(chatId);
      const prismaChat = await this.database.upsertChat(chat, from);
      if (this.database.isChatAdmin(prismaChat, from.id)) {
        return prismaChat;
      }
    } catch (e) {
      const errorCode = getErrorCode(e);
      if (errorCode === 400 || errorCode === 403) {
        // Chat was deleted, remove it from database.
        await this.database.chat.deleteMany({ where: { id: chatId } });
      }
    }

    if (ctx.callbackQuery) {
      await Promise.all([ctx.answerCbQuery(t("settings:forbidden"), { show_alert: true }), this.renderChats(ctx, 0)]);
    }
  }

  /**
   * Shows settings message after /mychats command
   * @param ctx Text message context
   */
  private async myChatsCommand(ctx: TextMessageCtx): Promise<void> {
    if (ctx.chat.type !== "private") {
      const { language } = await this.database.upsertChat(ctx.chat, ctx.message.from);
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
  private async promptSettings(ctx: MessageCtx, next: () => Promise<void>): Promise<void> {
    const botId = ctx.botInfo.id;
    const { message } = ctx.update;

    const [chat, userChat] = await Promise.all([
      this.database.upsertChat(ctx.chat, message.from),
      this.database.chat.findUnique({ select: { id: true, language: true }, where: { id: message.from.id } }),
    ]);

    const isBotAdded = "new_chat_members" in message && message.new_chat_members.some((m) => m.id === botId);
    const isChatCreated = "group_chat_created" in message || "supergroup_chat_created" in message;
    const isUserAdmin = this.database.isChatAdmin(chat, message.from.id, message.sender_chat?.id);

    if (userChat && isUserAdmin && (isBotAdded || isChatCreated)) {
      await changeLanguage(userChat.language);
      await ctx.telegram.sendMessage(userChat.id, t("settings:invitation"));
      await this.renderFeatures(ctx, chat.id);
    }

    await next();
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

    const [chats, count, prismaChat] = await Promise.all([
      this.database.chat.findMany({
        orderBy: { displayTitle: "asc" },
        select: { displayTitle: true, id: true },
        skip,
        take,
        where: { admins: { some: { id: from.id } } },
      }),
      this.database.chat.count({ where: { admins: { some: { id: from.id } } } }),
      this.database.upsertChat(ctx.chat, from),
    ]);
    await changeLanguage(prismaChat.language);

    if (skip === 0) {
      chats.unshift(prismaChat);
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
    const { callbackQuery, chat, telegram, update } = ctx;
    const from = "message" in update ? update.message.from : callbackQuery?.from;
    if (!from) {
      throw new Error("User is not defined to render features.");
    }
    if (!chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render features.");
    }
    if (isNaN(skip)) {
      throw new Error('Parameter "skip" is not correct to render features.');
    }

    const destPrismaChat = await (callbackQuery
      ? this.database.upsertChat(chat, from)
      : this.resolvePrismaChat(ctx, from.id));
    if (!destPrismaChat) {
      throw new Error("Target chat is not defined to render features.");
    }
    await changeLanguage(destPrismaChat.language);
    const prismaChat = await this.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBotsButton: InlineKeyboardButton[] = [
      { callback_data: `${AddingBotsAction.SETTINGS}?chatId=${chatId}`, text: t("addingBots:featureName") },
    ];
    const languageButton: InlineKeyboardButton[] = [
      { callback_data: `${LanguageAction.SETTINGS}?chatId=${chatId}`, text: t("language:featureName") },
    ];
    const messagesOnBehalfOfChannelsButton: InlineKeyboardButton[] = [
      {
        callback_data: `${MessagesOnBehalfOfChannelsAction.SETTINGS}?chatId=${chatId}`,
        text: t("messagesOnBehalfOfChannels:featureName"),
      },
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
    const allFeatures: Record<ChatType, InlineKeyboardButton[][]> = {
      [ChatType.CHANNEL]: [languageButton, timeZoneButton],
      [ChatType.GROUP]: [
        addingBotsButton,
        languageButton,
        messagesOnBehalfOfChannelsButton,
        profanityFilterButton,
        timeZoneButton,
        votebanButton,
      ],
      [ChatType.PRIVATE]: [languageButton, timeZoneButton],
      [ChatType.SUPERGROUP]: [
        addingBotsButton,
        languageButton,
        messagesOnBehalfOfChannelsButton,
        profanityFilterButton,
        timeZoneButton,
        votebanButton,
      ],
      [ChatType.UNKNOWN]: [],
    };
    const features = [...allFeatures[prismaChat.type]].sort((a, b) => a[0]?.text.localeCompare(b[0]?.text));

    const chatLink = getChatHtmlLink(prismaChat);
    const msg = t("settings:selectFeature", { CHAT: chatLink });
    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        ...features.slice(skip, skip + PAGE_SIZE),
        getPagination(`${SettingsAction.FEATURES}?chatId=${chatId}`, { count: features.length, skip, take: PAGE_SIZE }),
        [{ callback_data: SettingsAction.CHATS, text: `« ${t("settings:backToChats")}` }],
      ],
    };

    await Promise.all([
      callbackQuery && ctx.answerCbQuery(),
      callbackQuery && ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: replyMarkup }),
      !callbackQuery && telegram.sendMessage(from.id, msg, { parse_mode: "HTML", reply_markup: replyMarkup }),
    ]);
  }
}
