import { ChatSettingName, LanguageCode } from "@prisma/client";
import { changeLanguage, init, t } from "i18next";
import type { Database } from "modules/database";
import type { Settings } from "modules/settings";
import type { Telegraf } from "telegraf";
import { callbackQuery } from "telegraf/filters";
import type { BasicModule } from "types/basicModule";
import type { CallbackCtx } from "types/telegrafContext";
import { getCallbackQueryParams, getChatHtmlLink } from "utils/telegraf";

import { DEFAULT_NS } from "./language.constants";
import { LanguageAction } from "./language.types";
import en from "./translations/en.json";
import ru from "./translations/ru.json";

export class Language implements BasicModule {
  /**
   * Creates language module
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
   * Initiates language module
   */
  public async init(): Promise<void> {
    await init({
      defaultNS: DEFAULT_NS,
      fallbackLng: LanguageCode.EN,
      interpolation: { escapeValue: false },
      resources: { [LanguageCode.EN]: en, [LanguageCode.RU]: ru },
    });
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
      const { action, chatId, value } = getCallbackQueryParams(ctx);
      switch (action) {
        case LanguageAction.SAVE:
          await this.saveSettings(ctx, chatId, value);
          break;
        case LanguageAction.SETTINGS:
          await this.renderSettings(ctx, chatId);
          break;
        default:
          await next();
      }
    });
  }

  /**
   * Gets available language options
   * @returns Language options
   */
  private getOptions(): { code: LanguageCode; title: string }[] {
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
  private async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render language settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await this.settings.resolvePrismaChat(ctx, chatId);
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
      ctx.editMessageText(this.database.joinModifiedInfo(msg, ChatSettingName.LANGUAGE, prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `${LanguageAction.SAVE}?chatId=${chatId}&v=${LanguageCode.EN}`, text: enText }],
            [{ callback_data: `${LanguageAction.SAVE}?chatId=${chatId}&v=${LanguageCode.RU}`, text: ruText }],
            this.settings.getBackToFeaturesButton(chatId),
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
  private sanitizeValue(value: string | null | undefined): LanguageCode {
    return this.getOptions().find((l) => l.code === value)?.code ?? LanguageCode.EN;
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Language code
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save language settings.");
    }

    const { language: lng } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(lng);
    const prismaChat = await this.settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const language = this.sanitizeValue(value);

    await this.database.$transaction([
      this.database.chat.update({ data: { language }, select: { id: true }, where: { id: chatId } }),
      this.database.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.LANGUAGE),
    ]);
    await Promise.all([this.settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
