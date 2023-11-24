import { ChatSettingName, LanguageCode } from "@prisma/client";
import { settings, SettingsAction } from "features/settings";
import { changeLanguage, t } from "i18next";
import { CallbackCtx } from "types/context";
import { joinModifiedInfo, prisma, upsertPrismaChat, upsertPrismaChatSettingsHistory } from "utils/prisma";
import { getChatHtmlLink } from "utils/telegraf";

export class Language {
  /**
   * Gets available language options
   * @returns Language options
   */
  public getOptions(): { code: LanguageCode; title: string }[] {
    return [
      { code: LanguageCode.EN, title: "English" },
      { code: LanguageCode.RU, title: "Русский" },
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

    const chatLink = getChatHtmlLink(prismaChat);
    const enText = this.getOptions().find((l) => l.code === LanguageCode.EN)?.title ?? "";
    const ruText = this.getOptions().find((l) => l.code === LanguageCode.RU)?.title ?? "";
    const value = this.getOptions().find((l) => l.code === prismaChat.language)?.title ?? "";
    const msg = t("language:select", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, ChatSettingName.LANGUAGE, prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `${SettingsAction.LANGUAGE_SAVE}?chatId=${chatId}&v=${LanguageCode.EN}`, text: enText }],
            [{ callback_data: `${SettingsAction.LANGUAGE_SAVE}?chatId=${chatId}&v=${LanguageCode.RU}`, text: ruText }],
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
    return this.getOptions().find((l) => l.code === value)?.code ?? LanguageCode.EN;
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
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.LANGUAGE),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}

export const language = new Language();
