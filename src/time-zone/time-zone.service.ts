import { Injectable, Logger } from "@nestjs/common";
import { ChatSettingName } from "@prisma/client";
import { format, getTimezoneOffset } from "date-fns-tz";
import { changeLanguage, t } from "i18next";
import { On, Update } from "nestjs-telegraf";
import { PAGE_SIZE } from "src/app.constants";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx } from "src/types/telegraf-context";
import { buildCbData, getChatHtmlLink, getPagination, parseCbData } from "src/utils/telegraf";
import type { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

import { TimeZoneAction } from "./interfaces/action.interface";
import type { TimeZoneRenderSettingsOptions } from "./interfaces/settings-options.interface";

@Update()
@Injectable()
export class TimeZoneService {
  private readonly logger = new Logger(TimeZoneService.name);

  /**
   * Creates service
   * @param prismaService Database service
   * @param settingsService Settings service
   */
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Handles callback query related to time zone
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, skip, value } = parseCbData(ctx);
    switch (action) {
      case TimeZoneAction.SAVE:
        await this.saveSettings(ctx, chatId, value);
        break;
      case TimeZoneAction.SETTINGS:
        await this.renderSettings(ctx, { chatId, shouldAnswerCallback: true, skip });
        break;
      default:
        await next();
    }
  }

  /**
   * Gets all available time zone identifiers sorted by offset
   * @returns Time zone identifier
   */
  private getAllTimeZones(): string[] {
    return Intl.supportedValuesOf("timeZone").sort((a, b) => {
      const aOffset = getTimezoneOffset(a);
      const bOffset = getTimezoneOffset(b);
      if (aOffset < bOffset) {
        return -1;
      }
      return aOffset > bOffset ? 1 : 0;
    });
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param options Render options
   */
  private async renderSettings(ctx: CallbackCtx, options: TimeZoneRenderSettingsOptions): Promise<void> {
    const { chatId, shouldAnswerCallback, skip } = options;
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to render time zone settings");
      return;
    }

    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const timeZones = this.getAllTimeZones();
    const valueIndex = timeZones.indexOf(dbChat.timeZone);
    // Use provided skip or the index of the current value. Use 0 as the last fallback.
    const patchedSkip = skip ?? (valueIndex > -1 ? Math.floor(valueIndex / PAGE_SIZE) * PAGE_SIZE : 0);
    const value = `${format(Date.now(), "O", { timeZone: dbChat.timeZone })} ${dbChat.timeZone}`;
    const msg = t("timeZone:select", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(this.prismaService.joinModifiedInfo(msg, ChatSettingName.TIME_ZONE, dbChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...timeZones.slice(patchedSkip, patchedSkip + PAGE_SIZE).map((tz): InlineKeyboardButton[] => [
              {
                callback_data: buildCbData({ action: TimeZoneAction.SAVE, chatId, value: tz }),
                text: `${format(Date.now(), "O", { timeZone: tz })} ${tz}`,
              },
            ]),
            getPagination({
              action: TimeZoneAction.SETTINGS,
              chatId,
              count: timeZones.length,
              skip: patchedSkip,
            }),
            this.settingsService.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Time zone state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save time zone settings");
      return;
    }

    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const timeZone = value && Intl.supportedValuesOf("timeZone").includes(value) ? value : "Etc/UTC";

    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { timeZone }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.TIME_ZONE),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, { chatId })]);
  }
}
