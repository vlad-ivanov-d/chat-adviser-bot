import { ChatSettingName, ProfanityFilterRule } from "@prisma/client";
import { settings, SettingsAction } from "features/settings";
import { changeLanguage, t } from "i18next";
import { CallbackCtx, MessageCtx } from "types/context";
import {
  isPrismaChatAdmin,
  joinModifiedInfo,
  prisma,
  upsertPrismaChat,
  upsertPrismaChatSettingsHistory,
} from "utils/prisma";
import { Profanity } from "utils/profanity";
import { getChatHtmlLink, getUserFullName } from "utils/telegraf";

export class ProfanityFilter {
  private profaneWords?: string[];
  private profaneWordsDate: Date = new Date();

  /**
   * Filters message
   * @param ctx Message context
   * @returns True if profanity is detected and removed
   */
  public async filter(ctx: MessageCtx): Promise<boolean> {
    const { message } = ctx.update;
    const { chat, from, message_id: messageId, sender_chat: senderChat } = message;

    if ("is_automatic_forward" in message && message.is_automatic_forward) {
      return false; // Message from linked chat
    }

    const prismaChat = await upsertPrismaChat(chat, from);

    if (
      !prismaChat.profanityFilter || // Filter is disabled
      isPrismaChatAdmin(prismaChat, from.id, senderChat?.id) || // Current user is an admin
      !isPrismaChatAdmin(prismaChat, ctx.botInfo.id) // Bot is not an admin
    ) {
      return false;
    }

    const stringsToFilter = this.getStringsToFilter(ctx);
    const profaneWords = await this.getCachedProfaneWords();
    const profanity = new Profanity(profaneWords);

    if (
      profanity.filter(stringsToFilter.forwardChatTitle).hasProfanity ||
      profanity.filter(stringsToFilter.forwardSenderName).hasProfanity ||
      profanity.filter(stringsToFilter.forwardUserFullName).hasProfanity ||
      profanity.filter(stringsToFilter.senderChatTitle).hasProfanity ||
      profanity.filter(stringsToFilter.senderChatUserName).hasProfanity ||
      profanity.filter(stringsToFilter.text).hasProfanity ||
      profanity.filter(stringsToFilter.userFullName).hasProfanity ||
      profanity.filter(stringsToFilter.username).hasProfanity
    ) {
      // An expected error may happen if there are no enough permissions
      return ctx.deleteMessage(messageId).catch(() => false);
    }
    return false;
  }

  /**
   * Gets available profanity filter options
   * @returns Profanity filter options
   */
  public getOptions(): { id: ProfanityFilterRule | null; title: string }[] {
    return [
      { id: ProfanityFilterRule.FILTER, title: t("profanityFilter:enabled") },
      { id: null, title: t("profanityFilter:disabled") },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render profanity filter settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(prismaChat);
    const disableCbData = `${SettingsAction.PROFANITY_FILTER_SAVE}?chatId=${chatId}`;
    const filterCbData = `${SettingsAction.PROFANITY_FILTER_SAVE}?chatId=${chatId}&v=${ProfanityFilterRule.FILTER}`;
    const sanitizedValue = this.sanitizeValue(prismaChat.profanityFilter);
    const value = this.getOptions().find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("profanityFilter:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, ChatSettingName.PROFANITY_FILTER, prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: filterCbData, text: t("profanityFilter:enable") }],
            [{ callback_data: disableCbData, text: t("profanityFilter:disable") }],
            settings.getBackToFeaturesButton(chatId),
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
      throw new Error("Chat is not defined to save profanity filter settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const profanityFilter = this.sanitizeValue(value);

    await prisma.$transaction([
      prisma.chat.update({ data: { profanityFilter }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.PROFANITY_FILTER),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
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
   * Gets strings which should be checked by profanity filter
   * @param ctx Message context
   * @returns Object with strings which should be checked by profanity filter
   */
  private getStringsToFilter(ctx: MessageCtx): {
    forwardChatTitle: string;
    forwardSenderName: string;
    forwardUserFullName: string;
    senderChatTitle: string;
    senderChatUserName: string;
    text: string;
    userFullName: string;
    username: string;
  } {
    const { message } = ctx.update;
    const { from, sender_chat: senderChat } = message;
    return {
      forwardChatTitle:
        "forward_from_chat" in message && message.forward_from_chat && "title" in message.forward_from_chat
          ? message.forward_from_chat.title
          : "",
      forwardSenderName: "forward_sender_name" in message ? message.forward_sender_name ?? "" : "",
      forwardUserFullName:
        "forward_from" in message && message.forward_from ? getUserFullName(message.forward_from) : "",
      senderChatTitle: senderChat && "title" in senderChat ? senderChat.title : "",
      senderChatUserName: senderChat && "username" in senderChat ? senderChat.username ?? "" : "",
      text: this.getMessageText(ctx),
      userFullName: getUserFullName(from),
      username: from.username ?? "",
    };
  }

  /**
   * Gets message text from context
   * @param ctx Message context
   * @returns Message text
   */
  private getMessageText(ctx: MessageCtx): string {
    const { message } = ctx.update;
    const srcMessage = "pinned_message" in message ? message.pinned_message : message;
    if ("caption" in srcMessage) {
      return srcMessage.caption ?? "";
    }
    if ("left_chat_member" in srcMessage) {
      return getUserFullName(srcMessage.left_chat_member);
    }
    if ("new_chat_members" in srcMessage) {
      return srcMessage.new_chat_members.map((u) => getUserFullName(u)).join(", ");
    }
    if ("poll" in srcMessage) {
      return [srcMessage.poll.question, ...srcMessage.poll.options.map((o) => o.text)].join("\n");
    }
    if ("text" in srcMessage) {
      return srcMessage.text;
    }
    return "";
  }

  /**
   * Sanitizes profanity filter rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): ProfanityFilterRule | null {
    return value === ProfanityFilterRule.FILTER ? value : null;
  }
}

export const profanityFilter = new ProfanityFilter();