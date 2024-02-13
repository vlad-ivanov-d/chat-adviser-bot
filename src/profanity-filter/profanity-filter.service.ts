import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { ChatSettingName, ProfanityFilterRule } from "@prisma/client";
import { Cache as CacheManager } from "cache-manager";
import { changeLanguage, t } from "i18next";
import { Ctx, Next, On, Update } from "nestjs-telegraf";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, MessageCtx } from "src/types/telegraf-context";
import { Profanity } from "src/utils/profanity";
import { buildCbData, getChatHtmlLink, getUserFullName, parseCbData } from "src/utils/telegraf";

import { ProfanityFilterAction } from "./interfaces/action.interface";
import { WORDS_CACHE_KEY, WORDS_CACHE_TIMEOUT } from "./profanity-filter.constants";

@Update()
@Injectable()
export class ProfanityFilterService {
  /**
   * Creates profanity filter service
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
        await this.renderSettings(ctx, chatId);
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
    const { message: msg } = ctx.update;
    const { chat, from, message_id: messageId, sender_chat: senderChat } = msg;

    if ("is_automatic_forward" in msg && msg.is_automatic_forward) {
      // Message from linked chat
      await next();
      return;
    }

    if ("left_chat_member" in msg && msg.left_chat_member.id === ctx.botInfo.id) {
      // The bot is kicked from the chat
      await next();
      return;
    }

    const dbChat = await this.prismaService.upsertChat(chat, from);
    if (
      !dbChat.profanityFilter || // Filter is disabled
      this.prismaService.isChatAdmin(dbChat, from.id, senderChat?.id) || // Current user is an admin
      !this.prismaService.isChatAdmin(dbChat, ctx.botInfo.id) // Bot is not an admin
    ) {
      await next();
      return;
    }

    const stringsToFilter = this.getStringsToFilter(ctx);
    const profaneWords = await this.cacheManager.wrap(
      WORDS_CACHE_KEY,
      () => this.prismaService.profaneWord.findMany({ select: { word: true } }),
      WORDS_CACHE_TIMEOUT,
    );
    const profanity = new Profanity(profaneWords.map((i) => i.word));

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
      const isDeleted = await ctx.deleteMessage(messageId).catch(() => false);
      if (isDeleted && !("new_chat_members" in msg)) {
        return; // Do not continue processing if the message is deleted and it's not the new_chat_member event.
      }
    }

    await next();
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
   * @param ctx Message context
   * @returns Message text
   */
  private getMessageText(ctx: MessageCtx): string {
    const srcMessage = "pinned_message" in ctx.update.message ? ctx.update.message.pinned_message : ctx.update.message;
    if ("caption" in srcMessage) {
      return srcMessage.caption ?? "";
    }
    if ("left_chat_member" in srcMessage) {
      return getUserFullName(srcMessage.left_chat_member);
    }
    if ("new_chat_members" in srcMessage) {
      return srcMessage.new_chat_members.map(getUserFullName).join(", ");
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
    const { message: msg } = ctx.update;
    const { from, sender_chat: senderChat } = msg;
    return {
      forwardChatTitle:
        "forward_from_chat" in msg && msg.forward_from_chat && "title" in msg.forward_from_chat
          ? msg.forward_from_chat.title
          : "",
      forwardSenderName: "forward_sender_name" in msg ? msg.forward_sender_name ?? "" : "",
      forwardUserFullName: "forward_from" in msg && msg.forward_from ? getUserFullName(msg.forward_from) : "",
      senderChatTitle: senderChat && "title" in senderChat ? senderChat.title : "",
      senderChatUserName: senderChat && "username" in senderChat ? senderChat.username ?? "" : "",
      text: this.getMessageText(ctx),
      userFullName: getUserFullName(from),
      username: from.username ?? "",
    };
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render profanity filter settings.");
    }

    const { language } = await this.prismaService.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const disableCbData = buildCbData({ action: ProfanityFilterAction.SAVE, chatId });
    const filterCbData = buildCbData({ action: ProfanityFilterAction.SAVE, chatId, value: ProfanityFilterRule.FILTER });
    const sanitizedValue = this.sanitizeValue(dbChat.profanityFilter);
    const value = this.getOptions().find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("profanityFilter:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.prismaService.joinModifiedInfo(msg, ChatSettingName.PROFANITY_FILTER, dbChat), {
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
      throw new Error("Chat is not defined to save profanity filter settings.");
    }

    const { language } = await this.prismaService.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const profanityFilter = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { profanityFilter }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.PROFANITY_FILTER),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
