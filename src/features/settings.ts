import { ChatType } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { InlineKeyboardButton, InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { CallbackCtx, MessageCtx, TextMessageCtx } from "types/context";
import { PrismaChat } from "types/prismaChat";
import { PAGE_SIZE } from "utils/consts";
import { isPrismaChatAdmin, prisma, upsertPrismaChat } from "utils/prisma";
import { getChatHtmlLink, getPagination, getTelegramErrorCode, isCleanCommand } from "utils/telegraf";

export enum SettingsAction {
  ADDING_BOTS = "cfg-addng-bts",
  ADDING_BOTS_SAVE = "cfg-addng-bts-sv",
  CHATS = "cfg-chats",
  FEATURES = "cfg-ftrs",
  LANGUAGE = "cfg-lng",
  LANGUAGE_SAVE = "cfg-lng-sv",
  PROFANITY_FILTER = "cfg-pf",
  PROFANITY_FILTER_SAVE = "cfg-pf-sv",
  REFRESH = "cfg-rfrsh",
  TIME_ZONE = "cfg-tz",
  TIME_ZONE_SAVE = "cfg-tz-sv",
  VOTEBAN = "cfg-vtbn",
  VOTEBAN_SAVE = "cfg-vtbn-sv",
}

export class Settings {
  /**
   * Provides the ability to get all shared chats where the user is an admin
   * @param ctx Text message context
   * @param cleanCommand Clean command name
   */
  public async command(ctx: TextMessageCtx, cleanCommand: string): Promise<void> {
    if (!isCleanCommand(cleanCommand, ctx.message.text)) {
      return; // Not clean command, ignore.
    }

    if (ctx.chat.type !== "private") {
      const { language } = await upsertPrismaChat(ctx.chat, ctx.message.from);
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
   */
  public async promptSettings(ctx: MessageCtx): Promise<void> {
    const botId = ctx.botInfo.id;
    const { message } = ctx.update;

    const [chat, userChat] = await Promise.all([
      upsertPrismaChat(ctx.chat, message.from),
      prisma.chat.findUnique({ select: { id: true, language: true }, where: { id: message.from.id } }),
    ]);

    const isBotAdded = "new_chat_members" in message && message.new_chat_members.some((m) => m.id === botId);
    const isChatCreated = "group_chat_created" in message || "supergroup_chat_created" in message;
    const isUserAdmin = isPrismaChatAdmin(chat, message.from.id, message.sender_chat?.id);

    if (userChat && isUserAdmin && (isBotAdded || isChatCreated)) {
      await changeLanguage(userChat.language);
      await ctx.telegram.sendMessage(userChat.id, t("settings:invitation"));
      await this.renderFeatures(ctx, chat.id);
    }
  }

  /**
   * Renders chats
   * @param ctx Callback or message context
   * @param skip Skip count
   */
  public async renderChats(ctx: CallbackCtx | MessageCtx, skip = 0): Promise<void> {
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
      prisma.chat.findMany({
        orderBy: { displayTitle: "asc" },
        select: { displayTitle: true, id: true },
        skip,
        take,
        where: { admins: { some: { id: from.id } } },
      }),
      prisma.chat.count({ where: { admins: { some: { id: from.id } } } }),
      upsertPrismaChat(ctx.chat, from),
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
          // An expected error may happen if message has the same text after edit
          ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: replyMarkup }).catch(() => undefined),
        ]));
  }

  /**
   * Renders features
   * @param ctx Callback or message context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  public async renderFeatures(ctx: CallbackCtx | MessageCtx, chatId: number, skip = 0): Promise<void> {
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

    const destPrismaChat = await (callbackQuery ? upsertPrismaChat(chat, from) : this.resolvePrismaChat(ctx, from.id));
    if (!destPrismaChat) {
      throw new Error("Target chat is not defined to render features.");
    }
    await changeLanguage(destPrismaChat.language);
    const prismaChat = await this.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBotsButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.ADDING_BOTS}?chatId=${chatId}`, text: t("addingBots:featureName") },
    ];
    const languageButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.LANGUAGE}?chatId=${chatId}`, text: t("language:featureName") },
    ];
    const profanityFilterButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.PROFANITY_FILTER}?chatId=${chatId}`, text: t("profanityFilter:featureName") },
    ];
    const timeZoneButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.TIME_ZONE}?chatId=${chatId}`, text: t("timeZone:featureName") },
    ];
    const votebanButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.VOTEBAN}?chatId=${chatId}`, text: t("voteban:featureName") },
    ];
    const allFeatures: Record<ChatType, InlineKeyboardButton[][]> = {
      [ChatType.CHANNEL]: [languageButton, timeZoneButton],
      [ChatType.GROUP]: [addingBotsButton, languageButton, profanityFilterButton, timeZoneButton, votebanButton],
      [ChatType.PRIVATE]: [languageButton, timeZoneButton],
      [ChatType.SUPERGROUP]: [addingBotsButton, languageButton, profanityFilterButton, timeZoneButton, votebanButton],
      [ChatType.UNKNOWN]: [languageButton],
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
      const prismaChat = await upsertPrismaChat(chat, from);
      if (isPrismaChatAdmin(prismaChat, from.id)) {
        return prismaChat;
      }
    } catch (e) {
      const errorCode = getTelegramErrorCode(e);
      if (errorCode === 400 || errorCode === 403) {
        await prisma.chat.deleteMany({ where: { id: chatId } }); // Chat was deleted, remove it from database.
      }
    }

    if (ctx.callbackQuery) {
      await Promise.all([ctx.answerCbQuery(t("settings:forbidden"), { show_alert: true }), this.renderChats(ctx, 0)]);
    }
  }
}

export const settings = new Settings();
