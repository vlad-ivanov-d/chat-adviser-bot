import { ChatSettingName } from "@prisma/client";
import { PAGE_SIZE } from "constants/pagination";
import { format, getTimezoneOffset } from "date-fns-tz";
import { changeLanguage, t } from "i18next";
import type { Database } from "modules/database";
import type { Settings } from "modules/settings";
import type { Telegraf } from "telegraf";
import { callbackQuery } from "telegraf/filters";
import type { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import type { CallbackCtx } from "types/telegrafContext";
import { getCallbackQueryParams, getChatHtmlLink, getPagination } from "utils/telegraf";

import { TimeZoneAction } from "./timeZone.types";

export class TimeZone {
  /**
   * Creates time zone module
   * @param bot Telegraf bot instance
   * @param database Database
   * @param settings Settings
   */
  public constructor(
    private readonly bot: Telegraf,
    private readonly database: Database,
    private readonly settings: Settings,
  ) {}

  /**
   * Initiates time zone module
   */
  public init(): void {
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
      const { action, chatId, skip, value } = getCallbackQueryParams(ctx);
      switch (action) {
        case TimeZoneAction.SAVE:
          await this.saveSettings(ctx, chatId, value);
          break;
        case TimeZoneAction.SETTINGS:
          await this.renderSettings(ctx, chatId, skip);
          break;
        default:
          await next();
      }
    });
  }

  /**
   * Gets all available time zone identifiers
   * @returns Time zone identifier
   */
  private getAllTimeZones(): string[] {
    return Intl.supportedValuesOf("timeZone").sort((a, b) => {
      const aOffset = getTimezoneOffset(a);
      const bOffset = getTimezoneOffset(b);
      // Sort by offset
      if (aOffset < bOffset) {
        return -1;
      }
      if (aOffset > bOffset) {
        return 1;
      }
      // Then sort by name
      if (a < b) {
        return -1;
      }
      return a > b ? 1 : 0;
    });
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number, skip?: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render time zone settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await this.settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(prismaChat);
    const timeZones = this.getAllTimeZones();
    const valueIndex = timeZones.indexOf(prismaChat.timeZone);
    // Use provided skip or the index of the current value. Use 0 as the last fallback.
    const patchedSkip = skip ?? (valueIndex > -1 ? valueIndex : 0);
    const value = `${format(new Date(), "O", { timeZone: prismaChat.timeZone })} ${prismaChat.timeZone}`;
    const msg = t("timeZone:select", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.database.joinModifiedInfo(msg, ChatSettingName.TIME_ZONE, prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...timeZones.slice(patchedSkip, patchedSkip + PAGE_SIZE).map((tz): InlineKeyboardButton[] => [
              {
                callback_data: `${TimeZoneAction.SAVE}?chatId=${chatId}&v=${tz}`,
                text: `${format(new Date(), "O", { timeZone: tz })} ${tz}`,
              },
            ]),
            getPagination(`${TimeZoneAction.SETTINGS}?chatId=${chatId}`, {
              count: timeZones.length,
              skip: patchedSkip,
              take: PAGE_SIZE,
            }),
            this.settings.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes adding bots rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): string {
    return value && Intl.supportedValuesOf("timeZone").includes(value) ? value : "Etc/UTC";
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Time zone state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save time zone settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await this.settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const timeZone = this.sanitizeValue(value);
    const skip = Math.max(0, Math.floor(this.getAllTimeZones().indexOf(timeZone) / PAGE_SIZE) * PAGE_SIZE);

    await this.database.$transaction([
      this.database.chat.update({ data: { timeZone }, select: { id: true }, where: { id: chatId } }),
      this.database.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.TIME_ZONE),
    ]);
    await Promise.all([this.settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId, skip)]);
  }
}
