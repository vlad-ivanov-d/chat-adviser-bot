import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ChatSettingName, LanguageCode } from "@prisma/client";
import { changeLanguage, init, t } from "i18next";
import { On, Update } from "nestjs-telegraf";
import type { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

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
export class LanguageService implements OnModuleInit {
  private readonly logger = new Logger(LanguageService.name);

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
        await this.renderSettings(ctx, chatId, true);
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
   * @param shouldAnswerCallback Answer callback query will be sent if true
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number, shouldAnswerCallback?: boolean): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to render language settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(chat);
    const value = this.getOptions().find((l) => l.code === chat.settings.language)?.title;
    const msg = t("language:select", { CHAT: chatLink, VALUE: value });
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.LANGUAGE,
      timeZone: settings.timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...this.getOptions().map((o): InlineKeyboardButton[] => [
              { callback_data: buildCbData({ action: LanguageAction.SAVE, chatId, value: o.code }), text: o.title },
            ]),
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
   * @param value Language code
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save language settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const language = this.getOptions().find((l) => l.code === value)?.code ?? LanguageCode.EN;

    await this.prismaService.$transaction([
      this.prismaService.chatSettings.update({ data: { language }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.LANGUAGE),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
