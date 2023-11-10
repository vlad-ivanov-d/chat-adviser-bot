import { format, getTimezoneOffset } from "date-fns-tz";
import { settings, SettingsAction } from "features/settings";
import { changeLanguage, t } from "i18next";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { CallbackCtx } from "types/context";
import { PAGE_SIZE } from "utils/consts";
import { joinModifiedInfo, prisma, upsertPrismaChat, upsertPrismaChatSettingsHistory } from "utils/prisma";
import { getChatHtmlLink, getPagination } from "utils/telegraf";

export class TimeZone {
  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param skip Skip count
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number, skip?: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render time zone settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatTitle = getChatHtmlLink(prismaChat);
    const timeZones = this.getAllTimeZones();
    const count = timeZones.length;
    const valueIndex = timeZones.indexOf(prismaChat.timeZone);
    // Use provided skip or the index of the current value. Use 0 as the last fallback.
    const patchedSkip = skip ?? (valueIndex > -1 ? valueIndex : 0);
    const value = `${format(new Date(), "O", { timeZone: prismaChat.timeZone })} ${prismaChat.timeZone}`;
    const msg = t("timeZone:select", { CHAT_TITLE: chatTitle, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, "timeZone", prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...timeZones.slice(patchedSkip, patchedSkip + PAGE_SIZE).map((tz): InlineKeyboardButton[] => [
              {
                callback_data: `${SettingsAction.TimeZoneSave}?chatId=${chatId}&v=${tz}`,
                text: `${format(new Date(), "O", { timeZone: tz })} ${tz}`,
              },
            ]),
            getPagination(`${SettingsAction.TimeZone}?chatId=${chatId}`, { count, skip: patchedSkip, take: PAGE_SIZE }),
            settings.getBackToFeaturesButton(chatId),
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
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save time zone settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const timeZone = this.sanitizeValue(value);
    const skip = Math.max(0, Math.floor(this.getAllTimeZones().indexOf(timeZone) / PAGE_SIZE) * PAGE_SIZE);

    await prisma.$transaction([
      prisma.chat.update({ data: { timeZone }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "timeZone"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId, skip)]);
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
   * Sanitizes adding bots rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): string {
    return value && Intl.supportedValuesOf("timeZone").includes(value) ? value : "Etc/UTC";
  }
}

export const timeZone = new TimeZone();
