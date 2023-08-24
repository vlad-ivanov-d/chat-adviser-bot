import { LanguageCode } from "@prisma/client";
import { settings, SettingsActions } from "features/settings";
import { t } from "i18next";
import { CallbackCtx } from "types/context";
import { joinModifiedInfo, prisma, upsertChat, upsertChatSettingsHistory } from "utils/prisma";

export class Language {
  /**
   * Gets available language options
   * @returns Language options
   */
  public getOptions(): { code: LanguageCode; title: string }[] {
    return [
      { code: LanguageCode.en, title: "English" },
      { code: LanguageCode.ru, title: "Русский" },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) return; // Something went wrong

    const [{ language: lng }, upsertedChat] = await Promise.all([
      upsertChat(ctx.chat, ctx.callbackQuery.from),
      upsertChat(chatId, ctx.callbackQuery.from),
    ]);

    const isAdmin = await settings.validateAdminPermissions(ctx, upsertedChat, lng);
    if (!isAdmin) return; // User is not an admin anymore, return.

    const enText = this.getOptions().find((l) => l.code === LanguageCode.en)?.title ?? "";
    const ruText = this.getOptions().find((l) => l.code === LanguageCode.ru)?.title ?? "";
    const value = this.getOptions().find((l) => l.code === upsertedChat.language)?.title ?? "";
    const msg = t("language:select", { CHAT_TITLE: upsertedChat.title, VALUE: value, lng });
    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, settingName: "language", upsertedChat }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `${SettingsActions.LanguageSave}?chatId=${chatId}&v=${LanguageCode.en}`, text: enText }],
            [{ callback_data: `${SettingsActions.LanguageSave}?chatId=${chatId}&v=${LanguageCode.ru}`, text: ruText }],
            settings.getBackToFeaturesButton(chatId, lng),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Language code
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) return; // Something went wrong

    const { from } = ctx.callbackQuery;
    const [{ language: lng }, upsertedChat] = await Promise.all([upsertChat(ctx.chat, from), upsertChat(chatId, from)]);

    const isAdmin = await settings.validateAdminPermissions(ctx, upsertedChat, lng);
    if (!isAdmin) return; // User is not an admin anymore, return.

    const language = this.getOptions().find((l) => l.code === value)?.code ?? "en";
    await prisma.$transaction([
      prisma.chat.update({ data: { language }, select: { id: true }, where: { id: chatId } }),
      upsertChatSettingsHistory(chatId, from.id, "language"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx, lng), this.renderSettings(ctx, chatId)]);
  }
}

export const language = new Language();
