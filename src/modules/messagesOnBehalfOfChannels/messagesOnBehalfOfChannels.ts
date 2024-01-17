import { ChatSettingName, MessagesOnBehalfOfChannelsRule } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import type { Database } from "modules/database";
import type { Settings } from "modules/settings";
import type { Telegraf } from "telegraf";
import { callbackQuery, message } from "telegraf/filters";
import type { BasicModule } from "types/basicModule";
import type { CallbackCtx, MessageCtx } from "types/telegrafContext";
import { getCallbackQueryParams, getChatHtmlLink } from "utils/telegraf";

import { MessagesOnBehalfOfChannelsAction } from "./messagesOnBehalfOfChannels.types";

export class MessagesOnBehalfOfChannels implements BasicModule {
  /**
   * Creates messages on behalf of channels module
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
   * Initiates messages on behalf of channels module
   */
  public init(): void {
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
      const { action, chatId, value } = getCallbackQueryParams(ctx);
      switch (action) {
        case MessagesOnBehalfOfChannelsAction.SAVE:
          await this.saveSettings(ctx, chatId, value);
          break;
        case MessagesOnBehalfOfChannelsAction.SETTINGS:
          await this.renderSettings(ctx, chatId);
          break;
        default:
          await next();
      }
    });
    this.bot.on(message(), (ctx, next) => this.filterMessage(ctx, next));
  }

  /**
   * Filters message
   * @param ctx Message context
   * @param next Function to continue processing
   */
  private async filterMessage(ctx: MessageCtx, next: () => Promise<void>): Promise<void> {
    const { message: msg } = ctx.update;
    const { chat, from, message_id: messageId, sender_chat: senderChat } = msg;

    if (
      !senderChat?.id || // Message from the user
      chat.id === senderChat.id || // Message from the admin
      ("left_chat_member" in msg && msg.left_chat_member.id === ctx.botInfo.id) || // The bot is kicked
      ("is_automatic_forward" in msg && msg.is_automatic_forward) // Message from the linked chat
    ) {
      await next();
      return;
    }

    const { messagesOnBehalfOfChannels } = await this.database.upsertChat(chat, from);

    if (messagesOnBehalfOfChannels === MessagesOnBehalfOfChannelsRule.FILTER) {
      // An expected error may happen when bot has no enough permissions
      await Promise.all([ctx.deleteMessage(messageId), ctx.banChatSenderChat(senderChat.id)]).catch(() => undefined);
      return;
    }

    await next();
  }

  /**
   * Gets available messages on behalf of channels filter options
   * @returns Messages on behalf of channels filter options
   */
  private getOptions(): { id: MessagesOnBehalfOfChannelsRule | null; title: string }[] {
    return [
      { id: MessagesOnBehalfOfChannelsRule.FILTER, title: t("messagesOnBehalfOfChannels:filterEnabled") },
      { id: null, title: t("messagesOnBehalfOfChannels:filterDisabled") },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render messages on behalf of channels filter settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settings.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const disableCbData = `${MessagesOnBehalfOfChannelsAction.SAVE}?chatId=${chatId}`;
    const filterCbData =
      MessagesOnBehalfOfChannelsAction.SAVE + `?chatId=${chatId}&v=${MessagesOnBehalfOfChannelsRule.FILTER}`;
    const sanitizedValue = this.sanitizeValue(dbChat.messagesOnBehalfOfChannels);
    const value = this.getOptions().find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("messagesOnBehalfOfChannels:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.database.joinModifiedInfo(msg, ChatSettingName.MESSAGES_ON_BEHALF_OF_CHANNELS, dbChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: filterCbData, text: t("messagesOnBehalfOfChannels:enableFilter") }],
            [{ callback_data: disableCbData, text: t("messagesOnBehalfOfChannels:disableFilter") }],
            this.settings.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes messages on behalf of channels rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): MessagesOnBehalfOfChannelsRule | null {
    return value === MessagesOnBehalfOfChannelsRule.FILTER ? value : null;
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Messages on behalf of channels filter state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save messages on behalf of channels filter settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settings.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const messagesOnBehalfOfChannels = this.sanitizeValue(value);

    await this.database.$transaction([
      this.database.chat.update({ data: { messagesOnBehalfOfChannels }, select: { id: true }, where: { id: chatId } }),
      this.database.upsertChatSettingsHistory(
        chatId,
        ctx.callbackQuery.from.id,
        ChatSettingName.MESSAGES_ON_BEHALF_OF_CHANNELS,
      ),
    ]);
    await Promise.all([this.settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
