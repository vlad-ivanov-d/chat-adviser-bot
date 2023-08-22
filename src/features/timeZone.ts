import { format, getTimezoneOffset } from "date-fns-tz";
import settings, { SettingsActions } from "features/settings";
import { t } from "i18next";
import { prisma } from "index";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { CallbackCtx } from "types/context";
import { PAGE_SIZE } from "utils/consts";
import { joinModifiedInfo, upsertChat, upsertChatSettingsHistory } from "utils/prisma";
import { getPagination } from "utils/telegram";

export class TimeZone {
  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number, skip: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) return; // Something went wrong

    const { from } = ctx.callbackQuery;
    const [{ language: lng }, upsertedChat] = await Promise.all([upsertChat(ctx.chat, from), upsertChat(chatId, from)]);

    const isAdmin = await settings.validateAdminPermissions(ctx, upsertedChat, lng);
    if (!isAdmin) return; // User is not an admin anymore, return.

    const timeZones = this.getAllTimeZones();
    const count = timeZones.length;

    const value = `${format(new Date(), "O", { timeZone: upsertedChat.timeZone })} ${upsertedChat.timeZone}`;
    const msg = t("timeZone:select", { CHAT_TITLE: upsertedChat.title, VALUE: value, lng });
    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, settingName: "timeZone", upsertedChat }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...timeZones.slice(skip, skip + PAGE_SIZE).map((tz): InlineKeyboardButton[] => [
              {
                callback_data: `${SettingsActions.TimeZoneSave}?chatId=${chatId}&v=${tz}`,
                text: `${format(new Date(), "O", { timeZone: tz })} ${tz}`,
              },
            ]),
            getPagination(`${SettingsActions.TimeZone}?chatId=${chatId}`, { count, skip, take: PAGE_SIZE }),
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
   * @param value Restrict bots state
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) return; // Something went wrong

    const { from } = ctx.callbackQuery;
    const [{ language: lng }, upsertedChat] = await Promise.all([upsertChat(ctx.chat, from), upsertChat(chatId, from)]);

    const isAdmin = await settings.validateAdminPermissions(ctx, upsertedChat, lng);
    if (!isAdmin) return; // User is not an admin anymore, return.

    const timeZone = this.sanitizeValue(value);
    await prisma.$transaction([
      prisma.chat.update({ data: { timeZone }, select: { id: true }, where: { id: chatId } }),
      upsertChatSettingsHistory(chatId, from.id, "timeZone"),
    ]);
    const skip = Math.max(0, Math.floor(this.getAllTimeZones().indexOf(timeZone) / PAGE_SIZE) * PAGE_SIZE);
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
      // Sort by offset first and then by name
      if (aOffset < bOffset) return -1;
      if (aOffset > bOffset) return 1;
      if (a < b) return -1;
      return a > b ? 1 : 0;
    });
  }

  /**
   * Sanitizes adding bots rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): string {
    return value && Intl.supportedValuesOf("timeZone").includes(value) ? value : "Europe/London";
  }
}

const timeZone = new TimeZone();
export default timeZone;
