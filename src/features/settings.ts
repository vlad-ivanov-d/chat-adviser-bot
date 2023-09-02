import { t } from "i18next";
import { Chat, InlineKeyboardButton, InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { CallbackCtx, MessageCtx } from "types/context";
import { PrismaChat } from "types/prismaChat";
import { PAGE_SIZE } from "utils/consts";
import { isPrismaChatAdmin, prisma, upsertPrismaChat } from "utils/prisma";
import { getPagination, isCleanCommand } from "utils/telegraf";

export enum SettingsAction {
  AddingBots = "cfg-addng-bts",
  AddingBotsSave = "cfg-addng-bts-sv",
  Chats = "cfg-chats",
  Features = "cfg-ftrs",
  Language = "cfg-lng",
  LanguageSave = "cfg-lng-sv",
  TimeZone = "cfg-tz",
  TimeZoneSave = "cfg-tz-sv",
  Voteban = "cfg-vtbn",
  VotebanSave = "cfg-vtbn-sv",
}

export class Settings {
  /**
   * Provides the ability to get all shared chats where the user is an admin
   * @param ctx Message context
   * @param cleanCommand Clean command name
   */
  public async command(ctx: MessageCtx, cleanCommand: string): Promise<void> {
    if (!isCleanCommand(cleanCommand, ctx.message.text)) {
      return; // Not clean command, ignore.
    }
    if (ctx.chat.type !== "private") {
      const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.message.from);
      await ctx.reply(t("common:commandForPrivateChat", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}`, lng }), {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message.message_id,
      });
      return;
    }
    await this.renderChats(ctx, 0);
  }

  /**
   * Renders chats
   * @param ctx Callback or message context
   * @param skip Skip count
   */
  public async renderChats(ctx: CallbackCtx | MessageCtx, skip: number): Promise<void> {
    const from = (ctx as CallbackCtx).callbackQuery?.from ?? ctx.message?.from;
    if (!ctx.chat || !from || isNaN(skip)) {
      return; // Something went wrong
    }

    const patchedTake = skip === 0 ? PAGE_SIZE - 1 : PAGE_SIZE;
    const [prismaChat, [count, prismaChats]] = await Promise.all([
      upsertPrismaChat(ctx.chat, from),
      prisma.$transaction([
        prisma.chat.count({ where: { admins: { some: { id: from.id } } } }),
        prisma.chat.findMany({
          orderBy: { title: "asc" },
          select: { id: true, title: true },
          skip,
          take: patchedTake,
          where: { admins: { some: { id: from.id } } },
        }),
      ]),
    ]);
    if (skip === 0) {
      prismaChats.unshift(prismaChat);
    }

    const { language: lng } = prismaChat;
    const inlineKeyboardMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        ...prismaChats.map((c) => [{ callback_data: `${SettingsAction.Features}?chatId=${c.id}`, text: c.title }]),
        getPagination(SettingsAction.Chats, { count, skip, take: patchedTake }),
      ],
    };
    const msg = [t("settings:selectChat", { lng }), t("settings:updateInfoHint", { lng })].join("\n\n");
    await (typeof ctx.callbackQuery === "undefined"
      ? ctx.reply(msg, { reply_markup: inlineKeyboardMarkup })
      : Promise.all([ctx.answerCbQuery(), ctx.editMessageText(msg, { reply_markup: inlineKeyboardMarkup })]));
  }

  /**
   * Renders features
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  public async renderFeatures(ctx: CallbackCtx, chatId: number, skip: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId) || isNaN(skip)) {
      return; // Something went wrong
    }

    const [{ language: lng }, { title, type }] = await Promise.all([
      upsertPrismaChat(ctx.chat, ctx.callbackQuery.from),
      upsertPrismaChat(chatId, ctx.callbackQuery.from),
    ]);

    const addingBotsButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.AddingBots}?chatId=${chatId}`, text: t("addingBots:featureName", { lng }) },
    ];
    const languageButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.Language}?chatId=${chatId}`, text: t("language:featureName", { lng }) },
    ];
    const timeZoneButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.TimeZone}?chatId=${chatId}`, text: t("timeZone:featureName", { lng }) },
    ];
    const votebanButton: InlineKeyboardButton[] = [
      { callback_data: `${SettingsAction.Voteban}?chatId=${chatId}`, text: t("voteban:featureName", { lng }) },
    ];
    const allFeatures: Record<Chat["type"], InlineKeyboardButton[][]> = {
      channel: [languageButton, timeZoneButton],
      group: [addingBotsButton, languageButton, timeZoneButton, votebanButton],
      private: [languageButton, timeZoneButton],
      supergroup: [addingBotsButton, languageButton, timeZoneButton, votebanButton],
    };

    const features = [...allFeatures[type as Chat["type"]]].sort((a, b) => a[0]?.text.localeCompare(b[0]?.text));
    const count = features.length;
    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(t("settings:selectFeature", { CHAT_TITLE: title, lng }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...features.slice(skip, skip + PAGE_SIZE),
            getPagination(`${SettingsAction.Features}?chatId=${chatId}`, { count, skip, take: PAGE_SIZE }),
            [{ callback_data: SettingsAction.Chats, text: `« ${t("settings:backToChats", { lng })}` }],
          ],
        },
      }),
    ]);
  }

  /**
   * Gets back to features button
   * @param chatId Chat id
   * @param lng Language code
   * @returns Inline button
   */
  public getBackToFeaturesButton(chatId: number, lng: string): InlineKeyboardButton[] {
    return [
      {
        callback_data: `${SettingsAction.Features}?chatId=${chatId}`,
        text: `« ${t("settings:backToFeatures", { lng })}`,
      },
    ];
  }

  /**
   * Notifies user about successfully saved changes
   * @param ctx Callback context
   * @param lng Alert language code
   */
  public async notifyChangesSaved(ctx: CallbackCtx, lng: string): Promise<void> {
    await ctx.answerCbQuery(t("settings:changesSaved", { lng }), { show_alert: true });
  }

  /**
   * Validates admin permissions and redirects to chat list with alert
   * @param ctx Callback context
   * @param prismaChat Prisma chat
   * @param lng Language code
   * @returns True if validation is successfully passed
   */
  public async validateAdminPermissions(ctx: CallbackCtx, prismaChat: PrismaChat, lng: string): Promise<boolean> {
    if (isPrismaChatAdmin(prismaChat, ctx.callbackQuery.from.id)) {
      return true;
    }
    await Promise.all([
      ctx.answerCbQuery(t("settings:forbidden", { lng }), { show_alert: true }),
      this.renderChats(ctx, 0),
    ]);
    return false;
  }
}

export const settings = new Settings();
