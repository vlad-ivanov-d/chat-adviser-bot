import { format, getTimezoneOffset } from "date-fns-tz";
import { settings, SettingsAction } from "features/settings";
import { t } from "i18next";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { CallbackCtx } from "types/context";
import { PAGE_SIZE } from "utils/consts";
import { joinModifiedInfo, prisma, upsertPrismaChat, upsertPrismaChatSettingsHistory } from "utils/prisma";
import { getPagination } from "utils/telegraf";

export class TimeZone {
  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  async renderSettings(ctx: CallbackCtx, chatId: number, skip: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const timeZones = this.getAllTimeZones();
    const count = timeZones.length;
    const value = `${format(new Date(), "O", { timeZone: prismaChat.timeZone })} ${prismaChat.timeZone}`;
    const msg = t("timeZone:select", { CHAT_TITLE: prismaChat.displayTitle, VALUE: value, lng });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, prismaChat, settingName: "timeZone" }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...timeZones.slice(skip, skip + PAGE_SIZE).map((tz): InlineKeyboardButton[] => [
              {
                callback_data: `${SettingsAction.TimeZoneSave}?chatId=${chatId}&v=${tz}`,
                text: `${format(new Date(), "O", { timeZone: tz })} ${tz}`,
              },
            ]),
            getPagination(`${SettingsAction.TimeZone}?chatId=${chatId}`, { count, skip, take: PAGE_SIZE }),
            settings.getBackToFeaturesButton(chatId, lng),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit;
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Time zone state
   */
  async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const timeZone = this.sanitizeValue(value);
    const skip = Math.max(0, Math.floor(this.getAllTimeZones().indexOf(timeZone) / PAGE_SIZE) * PAGE_SIZE);

    await prisma.$transaction([
      prisma.chat.update({ data: { timeZone }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "timeZone"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx, lng), this.renderSettings(ctx, chatId, skip)]);
  }

  /**
   * Gets all available time zone identifiers
   * @returns Time zone identifier
   */
  private getAllTimeZones(): string[] {
    return Intl.supportedValuesOf("timeZone").sort((a, b) => {
      const aOffset = getTimezoneOffset(a) ?? 0;
      const bOffset = getTimezoneOffset(b) ?? 0;
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
   * Sanitizes adding bots rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): string {
    return value && Intl.supportedValuesOf("timeZone").includes(value) ? value : "Etc/UTC";
  }
}

export const timeZone = new TimeZone();
