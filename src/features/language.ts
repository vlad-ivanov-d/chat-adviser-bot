import { LanguageCode } from "@prisma/client";
import { settings, SettingsAction } from "features/settings";
import { changeLanguage, t } from "i18next";
import { CallbackCtx } from "types/context";
import { joinModifiedInfo, prisma, upsertPrismaChat, upsertPrismaChatSettingsHistory } from "utils/prisma";

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
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render language settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const enText = this.getOptions().find((l) => l.code === LanguageCode.en)?.title ?? "";
    const ruText = this.getOptions().find((l) => l.code === LanguageCode.ru)?.title ?? "";
    const value = this.getOptions().find((l) => l.code === prismaChat.language)?.title ?? "";
    const msg = t("language:select", { CHAT_TITLE: prismaChat.displayTitle, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, "language", prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `${SettingsAction.LanguageSave}?chatId=${chatId}&v=${LanguageCode.en}`, text: enText }],
            [{ callback_data: `${SettingsAction.LanguageSave}?chatId=${chatId}&v=${LanguageCode.ru}`, text: ruText }],
            settings.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes language code
   * @param value Value
   * @returns Sanitized value
   */
  public sanitizeValue(value: string | null | undefined): LanguageCode {
    return this.getOptions().find((l) => l.code === value)?.code ?? "en";
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Language code
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save language settings.");
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(lng);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const language = this.sanitizeValue(value);

    await prisma.$transaction([
      prisma.chat.update({ data: { language }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "language"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}

export const language = new Language();
