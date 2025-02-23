import { Injectable, Logger } from "@nestjs/common";
import { ChatSettingName, Message, PlanType, SummaryRequestType, User } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Command, Ctx, On, Update } from "nestjs-telegraf";
import OpenAI from "openai";

import { UpsertedChat } from "src/prisma/interfaces/upserted-chat.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, CommandCtx } from "src/types/telegraf-context";
import { buildCbData, getChatHtmlLink, getUserFullName, parseCbData } from "src/utils/telegraf";

import { SummaryAction } from "./interfaces/action.interface";
import { MessagesParams } from "./interfaces/messages-params.interface";
import { SummaryTimeout } from "./interfaces/timeout.interface";
import {
  MAX_HOURS_COUNT,
  MAX_MESSAGES_COUNT,
  MIN_HOURS_COUNT,
  MIN_MESSAGES_COUNT,
  SUMMARY_TIMEOUT,
} from "./summary.constants";

@Update()
@Injectable()
export class SummaryService {
  private readonly aiClient = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL,
    defaultHeaders: { "api-key": process.env.OPENAI_API_KEY },
    defaultQuery: { "api-version": process.env.OPENAI_API_VERSION },
  });
  private readonly logger = new Logger(SummaryService.name);

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
   * Handles callback query related to summary
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, value } = parseCbData(ctx);
    switch (action) {
      case SummaryAction.SAVE:
        await this.saveSettings(ctx, chatId, value);
        break;
      case SummaryAction.SETTINGS:
        await this.renderSettings(ctx, chatId, true);
        break;
      default:
        await next();
    }
  }

  /**
   * Summarizes last messages by /summary command
   * @param ctx Text message context
   */
  @Command("summary")
  public async summaryCommand(@Ctx() ctx: CommandCtx): Promise<void> {
    const [chat, plan] = await Promise.all([
      this.prismaService.upsertChatWithCache(ctx.chat, ctx.message.from),
      this.prismaService.getChatPlan(ctx.chat.id),
    ]);
    await changeLanguage(chat.settings.language);

    const isAdmin = this.prismaService.isChatAdmin(chat, ctx.message.from.id, ctx.message.sender_chat?.id);
    const params = this.getMessagesParams(ctx.payload);

    // Check chat type
    if (ctx.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return;
    }
    // Check the feature status and the plan
    if (!chat.settings.isSummaryEnabled || !plan) {
      return;
    }
    // Check parameters
    if (!params.hoursCount && !params.messagesCount) {
      await ctx.reply(
        t("summary:invalidPayload", { MAX_HOURS_COUNT, MAX_MESSAGES_COUNT, MIN_HOURS_COUNT, MIN_MESSAGES_COUNT }),
        { reply_parameters: { message_id: ctx.message.message_id } },
      );
      return;
    }

    this.logger.log("The /summary command was used");

    const [messages, timeout] = await Promise.all([
      params.hoursCount
        ? this.prismaService.message.findMany({
            include: { author: true },
            orderBy: { createdAt: "desc" },
            take: params.messagesCount,
            where: {
              chatId: ctx.chat.id,
              createdAt: { gt: new Date(Date.now() - params.hoursCount * 60 * 60 * 1000) },
            },
          })
        : this.prismaService.message.findMany({
            include: { author: true },
            orderBy: { createdAt: "desc" },
            take: params.messagesCount,
            where: { chatId: ctx.chat.id },
          }),
      this.checkRequestTimeout(chat, plan),
      this.prismaService.upsertUser(ctx.message.from, ctx.message.from),
    ]);

    // Check if there is something to summarize
    if (messages.length === 0) {
      await ctx.reply(t("summary:noMessages"), { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    // Check if there is no timeout
    if (isAdmin ? timeout.hasAdminTimeout : timeout.hasUserTimeout) {
      await ctx.reply(t("summary:timeout"), { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }

    const conversation = messages
      .map((m) => this.formatMessage(m))
      .reverse()
      .join("\n\n");

    const [chatCompletion, loadingMessage] = await Promise.all([
      this.aiClient.chat.completions
        .create({
          messages: [
            { content: t("summary:systemContext"), role: "system" },
            { content: conversation, role: "user" },
          ],
          model: process.env.OPENAI_API_MODEL ?? "gpt-4o-mini",
        })
        .catch((e: unknown) => {
          this.logger.error(e);
          return null;
        }),
      ctx.reply(t("summary:loading"), { reply_parameters: { message_id: ctx.message.message_id } }),
    ]);

    const replyText = chatCompletion?.choices[0].message.content
      ? `${t("summary:summarizedMessages", { count: messages.length })}\n\n${chatCompletion.choices[0].message.content}`
      : t("summary:somethingWentWrong");
    await Promise.all([
      this.prismaService.summaryRequest.create({
        data: {
          authorId: ctx.message.from.id,
          chatId: ctx.chat.id,
          editorId: ctx.message.from.id,
          type: isAdmin && timeout.hasUserTimeout ? SummaryRequestType.ADMIN : SummaryRequestType.USER,
        },
        select: { id: true },
      }),
      ctx.deleteMessage(loadingMessage.message_id),
      ctx.reply(replyText, { reply_parameters: { message_id: ctx.message.message_id } }),
    ]);
  }

  /**
   * Checks timeout for the summary request
   * @param chat Chat to check
   * @param planType Plan type
   * @returns Summary limit if exists
   */
  private async checkRequestTimeout(chat: UpsertedChat, planType: PlanType): Promise<SummaryTimeout> {
    if (planType === "MAX") {
      return { hasAdminTimeout: false, hasUserTimeout: false };
    }
    const requests = await this.prismaService.summaryRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, type: true },
      where: { chatId: chat.id, createdAt: { gt: new Date(Date.now() - SUMMARY_TIMEOUT) } },
    });
    const hasAdminTimeout = requests.some((r) => r.type === SummaryRequestType.ADMIN);
    const hasUserTimeout = hasAdminTimeout || requests.some((r) => r.type === SummaryRequestType.USER);
    return { hasAdminTimeout, hasUserTimeout };
  }

  /**
   * Formats message for summary
   * @param message Message to format
   * @returns Formatted message
   */
  private formatMessage(message: Message & { author: User }): string {
    return [
      `#${message.messageId.toString()}`,
      message.messageThreadId?.toString() && `thread: #${message.messageThreadId.toString()}`,
      `user: ${getUserFullName(message.author)}`,
      message.author.username && `username: @${message.author.username}`,
      `messageType: ${message.type}`,
      message.forwardedFrom && `forwardedFrom: ${message.forwardedFrom}`,
      message.text && (message.forwardedFrom ? `forwardedText: ${message.text}` : `text: ${message.text}`),
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Gets parameters to request messages
   * @param payload Command payload
   * @returns Parameters to request messages
   */
  private getMessagesParams(payload: string): MessagesParams {
    // /summary 100
    if (/^\d+$/.test(payload)) {
      const messagesCount = Number(payload);
      return MIN_MESSAGES_COUNT <= messagesCount && messagesCount <= MAX_MESSAGES_COUNT ? { messagesCount } : {};
    }
    // /summary 24h
    if (/^\d+h$/.test(payload)) {
      const hours = Number(payload.slice(0, -1));
      return MIN_HOURS_COUNT <= hours && hours <= MAX_HOURS_COUNT
        ? { hoursCount: hours, messagesCount: MAX_MESSAGES_COUNT }
        : {};
    }
    // /summary
    if (!payload) {
      return { messagesCount: MAX_MESSAGES_COUNT };
    }
    // /summary incorrect
    return {};
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

    const [plan, { settings }] = await Promise.all([
      this.prismaService.getChatPlan(chatId),
      this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from),
    ]);
    await changeLanguage(settings.language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(chat);
    const disableCbData = buildCbData({ action: SummaryAction.SAVE, chatId });
    const enableCbData = buildCbData({ action: SummaryAction.SAVE, chatId, value: true });
    const value = chat.settings.isSummaryEnabled ? t("summary:enabled") : t("summary:disabled");
    const msg = [
      t("summary:description"),
      plan ? t("summary:set", { CHAT: chatLink, VALUE: value }) : t("common:planExpired"),
    ].join("\n\n- - -\n\n");
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.SUMMARY,
      timeZone: settings.timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(plan ? msgWithModifiedInfo : msg, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            ...(plan
              ? [
                  [{ callback_data: enableCbData, text: t("summary:enable") }],
                  [{ callback_data: disableCbData, text: t("summary:disable") }],
                ]
              : []),
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
   * @param value Summary state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save summary settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    await this.prismaService.$transaction([
      this.prismaService.chatSettings.update({
        data: { isSummaryEnabled: value?.toLowerCase() === "true" ? true : null },
        select: { id: true },
        where: { id: chatId },
      }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.SUMMARY),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
