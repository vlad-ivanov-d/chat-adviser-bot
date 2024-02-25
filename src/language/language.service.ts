import { Injectable } from "@nestjs/common";
import { ChatSettingName, LanguageCode } from "@prisma/client";
import { changeLanguage, init, t } from "i18next";
import { On, Update } from "nestjs-telegraf";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx } from "src/types/telegraf-context";
import { buildCbData, getChatHtmlLink, parseCbData } from "src/utils/telegraf";

import { LanguageAction } from "./interfaces/action.interface";
import { DEFAULT_NS } from "./language.constants";
import en from "./translations/en.json";
import ru from "./translations/ru.json";

@Update()
@Injectable()
export class LanguageService {
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
   * Handles callback query related to language
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, value } = parseCbData(ctx);
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
  }

  /**
   * Lifecycle event called once the host module's dependencies have been resolved
   */
  public async onModuleInit(): Promise<void> {
    await init({
      defaultNS: DEFAULT_NS,
      fallbackLng: LanguageCode.EN,
      interpolation: { escapeValue: false },
      resources: { [LanguageCode.EN]: en, [LanguageCode.RU]: ru },
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

    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const value = this.getOptions().find((l) => l.code === dbChat.language)?.title ?? "";
    const msg = t("language:select", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.prismaService.joinModifiedInfo(msg, ChatSettingName.LANGUAGE, dbChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                callback_data: buildCbData({ action: LanguageAction.SAVE, chatId, value: LanguageCode.EN }),
                text: this.getOptions().find((l) => l.code === LanguageCode.EN)?.title ?? "",
              },
            ],
            [
              {
                callback_data: buildCbData({ action: LanguageAction.SAVE, chatId, value: LanguageCode.RU }),
                text: this.getOptions().find((l) => l.code === LanguageCode.RU)?.title ?? "",
              },
            ],
            this.settingsService.getBackToFeaturesButton(chatId),
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

    const { language: lng } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(lng);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const language = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { language }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.LANGUAGE),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
