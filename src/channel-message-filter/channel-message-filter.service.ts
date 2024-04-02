import { Injectable, Logger } from "@nestjs/common";
import { ChannelMessageFilterRule, ChatSettingName } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Ctx, Next, On, Update } from "nestjs-telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, MessageCtx } from "src/types/telegraf-context";
import { buildCbData, getChatHtmlLink, parseCbData } from "src/utils/telegraf";

import { ChannelMessageFilterAction } from "./interfaces/action.interface";

@Update()
@Injectable()
export class ChannelMessageFilterService {
  private readonly logger = new Logger(ChannelMessageFilterService.name);

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
   * Handles callback query related to channel message filter
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, value } = parseCbData(ctx);
    switch (action) {
      case ChannelMessageFilterAction.SAVE:
        await this.saveSettings(ctx, chatId, value);
        break;
      case ChannelMessageFilterAction.SETTINGS:
        await this.renderSettings(ctx, chatId, true);
        break;
      default:
        await next();
    }
  }

  /**
   * Filters message
   * @param ctx Message context
   * @param next Function to continue processing
   */
  @On("message")
  public async filterMessage(@Ctx() ctx: MessageCtx, @Next() next: NextFunction): Promise<void> {
    const { message } = ctx.update;
    const { chat, from, message_id: messageId, sender_chat: senderChat } = message;

    if (
      !senderChat?.id || // Message from the user
      chat.id === senderChat.id || // Message from the admin
      "is_automatic_forward" in message // Message from the linked chat
    ) {
      await next();
      return;
    }

    const { channelMessageFilter } = await this.prismaService.upsertChatWithCache(chat, from);
    if (channelMessageFilter === ChannelMessageFilterRule.FILTER) {
      // An expected error may happen when bot has no enough permissions
      await Promise.all([ctx.deleteMessage(messageId), ctx.banChatSenderChat(senderChat.id)]).catch(() => false);
      return;
    }

    await next();
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param shouldAnswerCallback Answer callback query will be sent if true
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number, shouldAnswerCallback?: boolean): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to render channel message filter settings");
      return;
    }

    const { language, timeZone } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(chat);
    const disableCbData = buildCbData({ action: ChannelMessageFilterAction.SAVE, chatId });
    const filterCbData = buildCbData({
      action: ChannelMessageFilterAction.SAVE,
      chatId,
      value: ChannelMessageFilterRule.FILTER,
    });
    const sanitizedValue = this.sanitizeValue(chat.channelMessageFilter);
    const value =
      sanitizedValue === ChannelMessageFilterRule.FILTER
        ? t("channelMessageFilter:filterEnabled")
        : t("channelMessageFilter:filterDisabled");
    const msg = t("channelMessageFilter:set", { CHAT: chatLink, VALUE: value });
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.CHANNEL_MESSAGE_FILTER,
      timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: filterCbData, text: t("channelMessageFilter:enableFilter") }],
            [{ callback_data: disableCbData, text: t("channelMessageFilter:disableFilter") }],
            this.settingsService.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes channel message filter rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): ChannelMessageFilterRule | null {
    return value === ChannelMessageFilterRule.FILTER ? value : null;
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Channel message filter state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save channel message filter settings");
      return;
    }

    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const channelMessageFilter = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { channelMessageFilter }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(
        chatId,
        ctx.callbackQuery.from.id,
        ChatSettingName.CHANNEL_MESSAGE_FILTER,
      ),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
