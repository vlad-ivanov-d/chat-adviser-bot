import { ProfanityFilterRule } from "@prisma/client";
import { settings, SettingsAction } from "features/settings";
import { t } from "i18next";
import { CallbackCtx, MessageCtx } from "types/context";
import {
  isPrismaChatAdmin,
  joinModifiedInfo,
  prisma,
  upsertPrismaChat,
  upsertPrismaChatSettingsHistory,
} from "utils/prisma";
import { Profanity } from "utils/profanity";

export class ProfanityFilter {
  private profaneWords?: string[];
  private profaneWordsDate: Date = new Date();

  /**
   * Filters message
   * @param ctx Message context
   */
  public async filter(ctx: MessageCtx): Promise<void> {
    const { chat, from, message_id: messageId, sender_chat: senderChat } = ctx.update.message;

    const prismaChat = await upsertPrismaChat(chat, from);

    if (!prismaChat.profanityFilter) {
      return; // Filter is disabled, return.
    }
    if (isPrismaChatAdmin(prismaChat, from.id, senderChat?.id)) {
      return; // Current user is an admin, return.
    }
    if (!isPrismaChatAdmin(prismaChat, ctx.botInfo.id)) {
      return; // Bot is not an admin, return.
    }

    const senderChatUserName = senderChat && "username" in senderChat ? senderChat.username ?? "" : "";
    const senderChatTitle = senderChat && "title" in senderChat ? senderChat.title : "";
    const text = this.getMessageText(ctx);
    const userFullName = [from.first_name, from.last_name].filter((p) => p).join(" ");
    const userName = from.username ?? "";

    const profaneWords = await this.getCachedProfaneWords();
    const profanity = new Profanity(profaneWords);

    const { hasProfanity: hasProfanityInMessage } = profanity.filter(text);
    const { hasProfanity: hasProfanityInSenderChatTitle } = profanity.filter(senderChatTitle);
    const { hasProfanity: hasProfanityInSenderChatUserName } = profanity.filter(senderChatUserName);
    const { hasProfanity: hasProfanityInUserFullName } = profanity.filter(userFullName);
    const { hasProfanity: hasProfanityInUserName } = profanity.filter(userName);

    if (
      hasProfanityInMessage ||
      hasProfanityInSenderChatTitle ||
      hasProfanityInSenderChatUserName ||
      hasProfanityInUserFullName ||
      hasProfanityInUserName
    ) {
      // An expected error may happen when bot have no enough permissions
      await ctx.deleteMessage(messageId).catch(() => undefined);
    }
  }

  /**
   * Gets available profanity filter options
   * @param lng Language code
   * @returns Profanity filter options
   */
  public getOptions(lng: string): { id: ProfanityFilterRule | null; title: string }[] {
    return [
      { id: null, title: t("profanityFilter:disabled", { lng }) },
      { id: ProfanityFilterRule.enabled, title: t("profanityFilter:enabled", { lng }) },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const disabledCbData = `${SettingsAction.ProfanityFilterSave}?chatId=${chatId}`;
    const enabledCbData = `${SettingsAction.ProfanityFilterSave}?chatId=${chatId}&v=${ProfanityFilterRule.enabled}`;
    const sanitizedValue = this.sanitizeValue(prismaChat.profanityFilter);
    const value = this.getOptions(lng).find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("profanityFilter:set", { CHAT_TITLE: prismaChat.displayTitle, VALUE: value, lng });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, prismaChat: prismaChat, settingName: "profanityFilter" }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: disabledCbData, text: t("profanityFilter:disable", { lng }) }],
            [{ callback_data: enabledCbData, text: t("profanityFilter:enable", { lng }) }],
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
   * @param value Profanity filter state
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const profanityFilter = this.sanitizeValue(value);

    await prisma.$transaction([
      prisma.chat.update({ data: { profanityFilter }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "profanityFilter"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx, lng), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Gets profane words with 15 minutes cache
   * @returns Cached profane words
   */
  private async getCachedProfaneWords(): Promise<string[]> {
    const cacheTimeout = 15 * 60 * 1000; // 15 minutes
    if (!this.profaneWords || this.profaneWordsDate.getTime() < Date.now() - cacheTimeout) {
      const profaneWords = await prisma.profaneWord.findMany({ select: { word: true } });
      this.profaneWords = profaneWords.map(({ word }) => word);
      this.profaneWordsDate = new Date();
    }
    return this.profaneWords;
  }

  /**
   * Gets message text from context
   * @param ctx Message context
   * @returns Message text
   */
  private getMessageText(ctx: MessageCtx): string {
    const message = ctx.update.message;
    if ("caption" in message) {
      return message.caption ?? "";
    }
    if ("poll" in message) {
      return [message.poll.question, ...message.poll.options.map((o) => o.text)].join("\n");
    }
    if ("text" in message) {
      return message.text;
    }
    return "";
  }

  /**
   * Sanitizes profanity filter rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): ProfanityFilterRule | null {
    return value === ProfanityFilterRule.enabled ? value : null;
  }
}

export const profanityFilter = new ProfanityFilter();
