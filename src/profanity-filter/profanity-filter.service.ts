import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ChatSettingName, ProfanityFilterRule } from "@prisma/client";
import { Cache as CacheManager } from "cache-manager";
import { changeLanguage, t } from "i18next";
import { Ctx, Next, On, Update } from "nestjs-telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, type EditedMessageCtx, type MessageCtx } from "src/types/telegraf-context";
import { Profanity } from "src/utils/profanity";
import { buildCbData, getChatHtmlLink, getUserFullName, parseCbData } from "src/utils/telegraf";

import { ProfanityFilterAction } from "./interfaces/action.interface";
import type { FilterStrings, ForwardFilterStrings } from "./interfaces/filter-strings.interface";
import { FilterStringsResult } from "./interfaces/filter-strings-result.interface";
import { WORDS_CACHE_KEY, WORDS_CACHE_TTL } from "./profanity-filter.constants";

@Update()
@Injectable()
export class ProfanityFilterService {
  private readonly logger = new Logger(ProfanityFilterService.name);

  /**
   * Creates service
   * @param cacheManager Cache manager
   * @param prismaService Database service
   * @param settingsService Settings service
   */
  public constructor(
    @Inject(CACHE_MANAGER) private cacheManager: CacheManager,
    private readonly prismaService: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Handles callback query related to profanity filter
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, value } = parseCbData(ctx);
    switch (action) {
      case ProfanityFilterAction.SAVE:
        await this.saveSettings(ctx, chatId, value);
        break;
      case ProfanityFilterAction.SETTINGS:
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
  @On(["edited_message", "message"])
  public async filterMessage(@Ctx() ctx: EditedMessageCtx | MessageCtx, @Next() next: NextFunction): Promise<void> {
    const message = "message" in ctx.update ? ctx.update.message : ctx.update.edited_message;
    const { chat, from, message_id: messageId, sender_chat: senderChat } = message;

    if (
      "is_automatic_forward" in message ||
      ("left_chat_member" in message && message.left_chat_member.id === ctx.botInfo.id)
    ) {
      await next();
      return;
    }

    const dbChat = await this.prismaService.upsertChatWithCache(chat, from);
    if (
      !dbChat.settings.profanityFilter || // Filter is disabled
      this.prismaService.isChatAdmin(dbChat, from.id, senderChat?.id) || // Current user is an admin
      !this.prismaService.isChatAdmin(dbChat, ctx.botInfo.id) // Bot is not an admin
    ) {
      await next();
      return;
    }

    const stringsToFilter = this.getStringsToFilter(message);
    const profaneWords = await this.cacheManager.wrap(
      WORDS_CACHE_KEY,
      () => this.prismaService.profaneWord.findMany({ select: { word: true } }),
      WORDS_CACHE_TTL,
    );
    const profanity = new Profanity(profaneWords.map((i) => i.word));
    const result: FilterStringsResult = {
      forwardChatTitle: profanity.filter(stringsToFilter.forwardChatTitle),
      forwardSenderName: profanity.filter(stringsToFilter.forwardSenderName),
      forwardUserFullName: profanity.filter(stringsToFilter.forwardUserFullName),
      senderChatTitle: profanity.filter(stringsToFilter.senderChatTitle),
      senderChatUsername: profanity.filter(stringsToFilter.senderChatUsername),
      text: profanity.filter(stringsToFilter.text),
      userFullName: profanity.filter(stringsToFilter.userFullName),
      username: profanity.filter(stringsToFilter.username),
    };

    if (
      result.forwardChatTitle.hasProfanity ||
      result.forwardSenderName.hasProfanity ||
      result.forwardUserFullName.hasProfanity ||
      result.senderChatTitle.hasProfanity ||
      result.senderChatUsername.hasProfanity ||
      result.text.hasProfanity ||
      result.userFullName.hasProfanity ||
      result.username.hasProfanity
    ) {
      this.logProfanity(result);
      // An expected error may happen if there are no enough permissions
      const isDeleted = await ctx.deleteMessage(messageId).catch(() => false);
      if (isDeleted && !("new_chat_members" in message)) {
        return; // Do not continue processing if the message is deleted and it's not the new_chat_member event.
      }
    }

    await next();
  }

  /**
   * Gets strings from the forwarded message which should be checked by profanity filter
   * @param message Message
   * @returns Object with strings which should be checked by profanity filter
   */
  private getForwardRelatedStringsToFilter(
    message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
  ): ForwardFilterStrings {
    const forwardOrigin = "forward_origin" in message ? message.forward_origin : undefined;
    const forwardOriginChat = forwardOrigin && "chat" in forwardOrigin ? forwardOrigin.chat : undefined;
    const forwardOriginSenderChat =
      forwardOrigin && "sender_chat" in forwardOrigin ? forwardOrigin.sender_chat : undefined;
    const forwardChat = forwardOriginChat ?? forwardOriginSenderChat;
    return {
      forwardChatTitle: forwardChat && "title" in forwardChat ? forwardChat.title : "",
      forwardSenderName: forwardOrigin && "sender_user_name" in forwardOrigin ? forwardOrigin.sender_user_name : "",
      forwardUserFullName:
        forwardOrigin && "sender_user" in forwardOrigin ? getUserFullName(forwardOrigin.sender_user) : "",
    };
  }

  /**
   * Gets available profanity filter options
   * @returns Profanity filter options
   */
  private getOptions(): { id: ProfanityFilterRule | null; title: string }[] {
    return [
      { id: ProfanityFilterRule.FILTER, title: t("profanityFilter:enabled") },
      { id: null, title: t("profanityFilter:disabled") },
    ];
  }

  /**
   * Gets message text from context
   * @param message Message
   * @returns Message text
   */
  private getMessageText(
    message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
  ): string {
    if ("caption" in message) {
      return message.caption ?? "";
    }
    if ("left_chat_member" in message) {
      return getUserFullName(message.left_chat_member);
    }
    if ("new_chat_members" in message) {
      return message.new_chat_members.map(getUserFullName).join(", ");
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
   * Gets strings which should be checked by profanity filter
   * @param message Message
   * @returns Object with strings which should be checked by profanity filter
   */
  private getStringsToFilter(
    message: EditedMessageCtx["update"]["edited_message"] | MessageCtx["update"]["message"],
  ): FilterStrings {
    const { from, sender_chat: senderChat } = message;
    return {
      ...this.getForwardRelatedStringsToFilter(message),
      senderChatTitle: senderChat && "title" in senderChat ? senderChat.title : "",
      senderChatUsername: senderChat && "username" in senderChat ? senderChat.username ?? "" : "",
      text: this.getMessageText(message),
      userFullName: getUserFullName(from),
      username: from.username ?? "",
    };
  }

  /**
   * Logs found profanity
   * @param filterStringsResult Filter strings result
   */
  private logProfanity(filterStringsResult: FilterStringsResult): void {
    if (filterStringsResult.forwardChatTitle.hasProfanity) {
      const { text } = filterStringsResult.forwardChatTitle;
      this.logger.warn(`A profanity was found in forward chat title: ${text}`);
    }
    if (filterStringsResult.forwardSenderName.hasProfanity) {
      const { text } = filterStringsResult.forwardSenderName;
      this.logger.warn(`A profanity was found in forward sender name: ${text}`);
    }
    if (filterStringsResult.forwardUserFullName.hasProfanity) {
      const { text } = filterStringsResult.forwardUserFullName;
      this.logger.warn(`A profanity was found in forward user full name: ${text}`);
    }
    if (filterStringsResult.senderChatTitle.hasProfanity) {
      const { text } = filterStringsResult.senderChatTitle;
      this.logger.warn(`A profanity was found in sender chat title: ${text}`);
    }
    if (filterStringsResult.senderChatUsername.hasProfanity) {
      const { text } = filterStringsResult.senderChatUsername;
      this.logger.warn(`A profanity was found in sender chat username: ${text}`);
    }
    if (filterStringsResult.text.hasProfanity) {
      const { text } = filterStringsResult.text;
      this.logger.warn(`A profanity was found in text:\n${text}`);
    }
    if (filterStringsResult.userFullName.hasProfanity) {
      const { text } = filterStringsResult.userFullName;
      this.logger.warn(`A profanity was found in user full name: ${text}`);
    }
    if (filterStringsResult.username.hasProfanity) {
      const { text } = filterStringsResult.username;
      this.logger.warn(`A profanity was found in username: ${text}`);
    }
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param shouldAnswerCallback Answer callback query will be sent if true
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number, shouldAnswerCallback?: boolean): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to render profanity filter settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(chat);
    const disableCbData = buildCbData({ action: ProfanityFilterAction.SAVE, chatId });
    const filterCbData = buildCbData({ action: ProfanityFilterAction.SAVE, chatId, value: ProfanityFilterRule.FILTER });
    const value = this.getOptions().find((o) => o.id === chat.settings.profanityFilter)?.title ?? "";
    const msg = t("profanityFilter:set", { CHAT: chatLink, VALUE: value });
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.PROFANITY_FILTER,
      timeZone: settings.timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: filterCbData, text: t("profanityFilter:enable") }],
            [{ callback_data: disableCbData, text: t("profanityFilter:disable") }],
            this.settingsService.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes profanity filter rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): ProfanityFilterRule | null {
    return value === ProfanityFilterRule.FILTER ? value : null;
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Profanity filter state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save profanity filter settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const profanityFilter = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chatSettings.update({
        data: { profanityFilter },
        select: { id: true },
        where: { id: chatId },
      }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.PROFANITY_FILTER),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
