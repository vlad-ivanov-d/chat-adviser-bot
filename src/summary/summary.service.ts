import { Injectable, Logger } from "@nestjs/common";
import {
  ChatSettingName,
  ChatSettings,
  Message,
  PlanType,
  SummaryRequestType,
  SummaryType,
  User,
} from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Command, Ctx, On, Update } from "nestjs-telegraf";
import OpenAI from "openai";

import { UpsertedChat } from "src/prisma/interfaces/upserted-chat.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, CommandCtx } from "src/types/telegraf-context";
import { getUserFullName, parseCbData } from "src/utils/telegraf";

import { SummaryAction } from "./interfaces/action.interface";
import { MessagesParams } from "./interfaces/messages-params.interface";
import { SummaryTimeout } from "./interfaces/timeout.interface";
import {
  MAX_HOURS_COUNT,
  MAX_MESSAGES_COUNT,
  MIN_HOURS_COUNT,
  MIN_MESSAGES_COUNT,
  SUMMARY_ADMIN_REQUESTS_MAX_COUNT,
  SUMMARY_USER_TIMEOUT,
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
    const { action, chatId } = parseCbData(ctx);
    switch (action) {
      case SummaryAction.SAVE:
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
      this.prismaService.chatPlan.findUnique({ where: { id: ctx.chat.id } }),
    ]);
    await changeLanguage(chat.settings.language);

    const isAdmin = this.prismaService.isChatAdmin(chat, ctx.message.from.id, ctx.message.sender_chat?.id);
    const params = this.getMessagesParams(ctx.payload, chat.settings);

    // Check chat type
    if (ctx.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return;
    }
    // Check the feature status and the plan for the chat
    if (!chat.settings.summary || !plan || new Date(plan.expiredAt).getTime() < Date.now()) {
      return;
    }
    // Check parameters
    if (!params.isValid) {
      await ctx.reply(
        t("summary:invalidPayload", {
          MAX_HOURS_COUNT: MAX_HOURS_COUNT,
          MAX_MESSAGES_COUNT,
          MIN_HOURS_COUNT,
          MIN_MESSAGES_COUNT,
        }),
        { reply_parameters: { message_id: ctx.message.message_id } },
      );
      return;
    }

    this.logger.log("The /summary command was used");

    const messages = await this.prismaService.message.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: params.messages,
      where: {
        chatId: ctx.chat.id,
        createdAt: { gt: new Date(Date.now() - params.hours * 60 * 60 * 1000) },
        text: { not: null },
      },
    });

    // Check if there is something to summarize
    if (messages.length === 0) {
      await ctx.reply(t("summary:noMessages"), { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }

    const [summaryTimeout] = await Promise.all([
      this.checkRequestTimeout(chat, plan.type, isAdmin),
      this.prismaService.upsertUser(ctx.message.from, ctx.message.from),
    ]);

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

    const summary = chatCompletion?.choices[0].message.content ?? t("common:somethingWentWrong");
    await Promise.all([
      this.prismaService.summaryRequest.create({
        data: {
          authorId: ctx.message.from.id,
          chatId: ctx.chat.id,
          editorId: ctx.message.from.id,
          type: summaryTimeout?.hasUserTimeout && isAdmin ? SummaryRequestType.ADMIN : SummaryRequestType.USER,
        },
        select: { id: true },
      }),
      ctx.deleteMessage(loadingMessage.message_id),
      ctx.reply(summary, { reply_parameters: { message_id: ctx.message.message_id } }),
    ]);
  }

  /**
   * Checks timeout for the summary request
   * @param chat Chat to check
   * @param planType Plan type
   * @param isAuthorAdmin Indicates that the request is from an admin
   * @returns Summary limit if exists
   */
  private async checkRequestTimeout(
    chat: UpsertedChat,
    planType: PlanType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isAuthorAdmin: boolean,
  ): Promise<SummaryTimeout | null> {
    if (planType === "MAX") {
      return { hasAdminTimeout: false, hasUserTimeout: false, minutes: 0 };
    }
    const requests = await this.prismaService.summaryRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, type: true },
      where: { chatId: chat.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    const hasAdminTimeout =
      requests.filter((r) => r.type === SummaryRequestType.ADMIN).length >= SUMMARY_ADMIN_REQUESTS_MAX_COUNT;
    const hasUserTimeout = requests.some(
      (r) => r.type === SummaryRequestType.USER && r.createdAt.getTime() > Date.now() - SUMMARY_USER_TIMEOUT,
    );
    return { hasAdminTimeout, hasUserTimeout, minutes: 0 };
  }

  /**
   * Formats message for summary
   * @param message Message to format
   * @returns Formatted message
   */
  private formatMessage(message: Message & { author: User }): string {
    return [
      message.messageThreadId
        ? `#${message.messageId.toString()}, thread #${message.messageThreadId.toString()}`
        : `#${message.messageId.toString()}`,
      `User: ${getUserFullName(message.author)}`,
      message.author.username && `Username: @${message.author.username}`,
      message.text,
    ]
      .filter((p) => p)
      .join("\n");
  }

  /**
   * Gets parameters to request messages
   * @param payload Command payload
   * @param settings Chat settings
   * @returns Parameters to request messages
   */
  private getMessagesParams(payload: string, settings: ChatSettings): MessagesParams {
    // /summary 100
    if (/^\d+$/.test(payload)) {
      const messages = Number(payload);
      return MIN_MESSAGES_COUNT <= messages && messages <= MAX_MESSAGES_COUNT
        ? { hours: MAX_HOURS_COUNT, isValid: true, messages }
        : { hours: 0, isValid: false, messages: 0 };
    }
    // /summary 24h
    if (/^\d+h$/.test(payload)) {
      const hours = Number(payload.slice(0, -1));
      return MIN_HOURS_COUNT <= hours && hours <= MAX_HOURS_COUNT
        ? { hours, isValid: true, messages: MAX_MESSAGES_COUNT }
        : { hours: 0, isValid: false, messages: 0 };
    }
    // /summary
    if (!payload && settings.summary) {
      return {
        hours: settings.summaryType === SummaryType.HOURS ? settings.summary : MAX_HOURS_COUNT,
        isValid: true,
        messages: settings.summaryType === SummaryType.MESSAGES ? settings.summary : MAX_MESSAGES_COUNT,
      };
    }
    // /summary incorrect
    return { hours: 0, isValid: false, messages: 0 };
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

    const msg = [t("summary:description"), t("summary:expired")].join("\n\n- - -\n\n");
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.SUMMARY,
      timeZone: settings.timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [this.settingsService.getBackToFeaturesButton(chatId)] },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }
}
