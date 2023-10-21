import { changeLanguage, t } from "i18next";
import { Chat, InlineKeyboardButton, InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { CallbackCtx, TextMessageCtx } from "types/context";
import { PrismaChat } from "types/prismaChat";
import { PAGE_SIZE } from "utils/consts";
import { isPrismaChatAdmin, prisma, upsertPrismaChat } from "utils/prisma";
import { getPagination, getTelegramErrorCode, isCleanCommand } from "utils/telegraf";

export enum SettingsAction {
  AddingBots = "cfg-addng-bts",
  AddingBotsSave = "cfg-addng-bts-sv",
  Chats = "cfg-chats",
  Features = "cfg-ftrs",
  Language = "cfg-lng",
  LanguageSave = "cfg-lng-sv",
  ProfanityFilter = "cfg-pf",
  ProfanityFilterSave = "cfg-pf-sv",
  Refresh = "cfg-rfrsh",
  TimeZone = "cfg-tz",
  TimeZoneSave = "cfg-tz-sv",
  Voteban = "cfg-vtbn",
  VotebanSave = "cfg-vtbn-sv",
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
   * Renders chats
   * @param ctx Callback or text message context
   * @param skip Skip count
   */
  public async renderChats(ctx: CallbackCtx | TextMessageCtx, skip = 0): Promise<void> {
    const from = ctx.callbackQuery?.from ?? ctx.message?.from;
    const take = skip === 0 ? PAGE_SIZE - 1 : PAGE_SIZE;
    if (!ctx.chat || !from || isNaN(skip)) {
      return; // Something went wrong
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
        ...chats.map((c) => [{ callback_data: `${SettingsAction.Features}?chatId=${c.id}`, text: c.displayTitle }]),
        getPagination(SettingsAction.Chats, { count, skip, take }),
        [{ callback_data: SettingsAction.Refresh, text: `↻ ${t("settings:refresh")}` }],
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
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  public async renderFeatures(ctx: CallbackCtx, chatId: number, skip = 0): Promise<void> {
    if (!ctx.chat || isNaN(chatId) || isNaN(skip)) {
      return; // Something went wrong
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBotsButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.AddingBots}?chatId=${chatId}`, text: t("addingBots:featureName") },
    ];
    const languageButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.Language}?chatId=${chatId}`, text: t("language:featureName") },
    ];
    const profanityFilterButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.ProfanityFilter}?chatId=${chatId}`, text: t("profanityFilter:featureName") },
    ];
    const timeZoneButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.TimeZone}?chatId=${chatId}`, text: t("timeZone:featureName") },
    ];
    const votebanButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.Voteban}?chatId=${chatId}`, text: t("voteban:featureName") },
    ];
    const allFeatures: Record<Chat["type"], InlineKeyboardButton[][]> = {
      channel: [languageButton, timeZoneButton],
      group: [addingBotsButton, languageButton, profanityFilterButton, timeZoneButton, votebanButton],
      private: [languageButton, timeZoneButton],
      supergroup: [addingBotsButton, languageButton, profanityFilterButton, timeZoneButton, votebanButton],
    };
    const features = [...allFeatures[prismaChat.type]].sort((a, b) => a[0]?.text.localeCompare(b[0]?.text));
    const count = features.length;

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(t("settings:selectFeature", { CHAT_TITLE: prismaChat.displayTitle }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...features.slice(skip, skip + PAGE_SIZE),
            getPagination(`${SettingsAction.Features}?chatId=${chatId}`, { count, skip, take: PAGE_SIZE }),
            [{ callback_data: SettingsAction.Chats, text: `« ${t("settings:backToChats")}` }],
          ],
        },
      }),
    ]);
  }

  /**
   * Gets back to features button
   * @param chatId Chat id
   * @returns Inline button
   */
  public getBackToFeaturesButton(chatId: number): InlineKeyboardButton[] {
    return [
      { callback_data: `${SettingsAction.Features}?chatId=${chatId}`, text: `« ${t("settings:backToFeatures")}` },
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
   * @param ctx Callback context
   * @param chatId Chat id
   * @returns True if validation is successfully passed
   */
  public async resolvePrismaChat(ctx: CallbackCtx, chatId: number): Promise<PrismaChat | undefined> {
    try {
      const chat = await ctx.telegram.getChat(chatId);
      const prismaChat = await upsertPrismaChat(chat, ctx.callbackQuery.from);
      if (isPrismaChatAdmin(prismaChat, ctx.callbackQuery.from.id)) {
        return prismaChat;
      }
    } catch (e) {
      const errorCode = getTelegramErrorCode(e);
      if (errorCode === 400 || errorCode === 403) {
        await prisma.chat.deleteMany({ where: { id: chatId } }); // Chat was deleted, remove it from database.
      }
    }
    await Promise.all([ctx.answerCbQuery(t("settings:forbidden"), { show_alert: true }), this.renderChats(ctx, 0)]);
  }
}

export const settings = new Settings();
