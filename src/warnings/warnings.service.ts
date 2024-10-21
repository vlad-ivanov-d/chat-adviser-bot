import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ChatSettingName } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Ctx, Hears, On, Update } from "nestjs-telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, TextMessageCtx } from "src/types/telegraf-context";
import { buildCbData, getChatHtmlLink, getUserOrChatHtmlLink, parseCbData } from "src/utils/telegraf";

import { WarningsAction, type WarnOptions } from "./interfaces/action.interface";
import { DELETE_MESSAGE_DELAY, OUTDATED_WARNING_TIMEOUT, WARNINGS_LIMIT } from "./warnings.constants";

@Update()
@Injectable()
export class WarningsService {
  private readonly logger = new Logger(WarningsService.name);

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
   * Handles callback query related to warnings
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, value } = parseCbData(ctx);
    switch (action) {
      case WarningsAction.SAVE:
        await this.saveSettings(ctx, chatId, value);
        break;
      case WarningsAction.SETTINGS:
        await this.renderSettings(ctx, chatId, true);
        break;
      default:
        await next();
    }
  }

  /**
   * Initiates cleanup cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async cleanup(): Promise<void> {
    await this.prismaService.warning.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - OUTDATED_WARNING_TIMEOUT) } },
    });
  }

  /**
   * Processes /warn command
   * @param ctx Text message context
   */
  @Hears("/warn")
  public async warnCommand(@Ctx() ctx: TextMessageCtx): Promise<void> {
    const { from, message_id: messageId, reply_to_message: replyToMessage, sender_chat: senderChat } = ctx.message;
    const candidate = replyToMessage?.from;
    const candidateSenderChat = replyToMessage?.sender_chat;
    const isCandidateAutomaticForward = !!replyToMessage && "is_automatic_forward" in replyToMessage;

    if (ctx.message.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return; // Private chat, return.
    }

    const [candidateMember, chat] = await Promise.all([
      typeof candidate?.id === "number" && !candidateSenderChat
        ? // An expected error may happen if the bot have no permissions to see the member list.
          ctx.telegram.getChatMember(ctx.chat.id, candidate.id).catch(() => undefined)
        : undefined,
      this.prismaService.upsertChatWithCache(ctx.chat, from),
    ]);
    await changeLanguage(chat.settings.language);

    if (!chat.settings.hasWarnings) {
      return; // The feature is disabled, return.
    }
    if (!this.prismaService.isChatAdmin(chat, ctx.botInfo.id)) {
      await ctx.reply(t("common:needAdminPermissions"), { reply_parameters: { message_id: messageId } });
      return; // Bot is not an admin, return.
    }
    if (!this.prismaService.isChatAdmin(chat, from.id, senderChat?.id)) {
      await ctx.reply(t("common:commandForAdmins"), { reply_parameters: { message_id: messageId } });
      return; // The user is not an admin, return.
    }
    if (!candidate) {
      await ctx.reply(t("warnings:replyToSomeonesMessage"), { reply_parameters: { message_id: messageId } });
      return; // No candidate, return.
    }
    if (candidate.id === ctx.botInfo.id) {
      await ctx.reply(t("warnings:cannotWarnMyself"), { reply_parameters: { message_id: messageId } });
      return; // Candidate is the bot itself, return.
    }
    if (
      isCandidateAutomaticForward ||
      candidateMember?.status === "administrator" ||
      candidateMember?.status === "creator" ||
      candidateSenderChat?.id === ctx.chat.id
    ) {
      await ctx.reply(t("warnings:cannotWarnAdmin"), { reply_parameters: { message_id: messageId } });
      return; // Candidate is an admin, return.
    }

    const mediaGroup =
      "media_group_id" in replyToMessage
        ? await this.prismaService.message.findMany({
            select: { messageId: true },
            where: {
              chatId: chat.id,
              mediaGroupId: replyToMessage.media_group_id,
              messageId: { not: replyToMessage.message_id },
            },
          })
        : [];
    const deleteMessageIds = [replyToMessage.message_id, ...mediaGroup.map((g) => g.messageId)];

    // Delete the message with a delay to let users know the reason
    setTimeout(() => {
      // An expected error may happen when bot has no enough permissions
      ctx.deleteMessages(deleteMessageIds).catch(() => false);
    }, DELETE_MESSAGE_DELAY);

    await Promise.all([
      // An expected error may happen when bot has no enough permissions
      ctx.deleteMessage(messageId).catch(() => false),
      candidateMember?.status !== "kicked" &&
        this.warn(ctx, { candidate, candidateMessageId: replyToMessage.message_id, candidateSenderChat }),
    ]);
  }

  /**
   * Issues the warning without additional checks (except warn duplication)
   * @param ctx Text message context
   * @param options Options to warn
   */
  private async warn(ctx: TextMessageCtx, options: WarnOptions): Promise<void> {
    const { candidate, candidateMessageId, candidateSenderChat } = options;
    if (candidateSenderChat) {
      await this.prismaService.upsertSenderChat(candidateSenderChat, ctx.from);
    }
    const createdAt = new Date();
    const [, warning, warnings] = await this.prismaService.$transaction([
      this.prismaService.upsertUser(candidate, ctx.from),
      this.prismaService.warning.upsert({
        create: {
          authorId: ctx.from.id,
          chatId: ctx.chat.id,
          createdAt,
          editorId: ctx.from.id,
          messageId: candidateMessageId,
          senderChatId: candidateSenderChat?.id ?? null,
          updatedAt: createdAt,
          userId: candidate.id,
        },
        select: { createdAt: true, id: true },
        update: { editorId: ctx.from.id, updatedAt: createdAt },
        where: { chatId_messageId: { chatId: ctx.chat.id, messageId: candidateMessageId } },
      }),
      this.prismaService.warning.findMany({
        select: { id: true },
        where: {
          chatId: ctx.chat.id,
          createdAt: { gte: new Date(Date.now() - OUTDATED_WARNING_TIMEOUT) },
          senderChatId: candidateSenderChat?.id ?? null,
          userId: candidate.id,
        },
      }),
    ]);

    if (warning.createdAt.getTime() !== createdAt.getTime()) {
      return; // Warning issued previously. There is no need to issue the warning again.
    }

    const candidateLink = getUserOrChatHtmlLink(candidate, candidateSenderChat);
    const { message_id: replyMessageId } = await ctx.reply(
      t("warnings:text", { USER: candidateLink, WARNINGS_COUNT: warnings.length, WARNINGS_LIMIT }),
      {
        parse_mode: "HTML",
        reply_parameters: { allow_sending_without_reply: true, message_id: candidateMessageId },
      },
    );

    this.logger.log("A warning was issued");

    if (warnings.length >= WARNINGS_LIMIT) {
      const [isChatMemberBanned, isSenderChatBanned] = await Promise.all([
        // An expected error may happen when bot has no enough permissions
        !candidateSenderChat && ctx.banChatMember(candidate.id).catch(() => false),
        candidateSenderChat && ctx.banChatSenderChat(candidateSenderChat.id).catch(() => false),
        this.prismaService.warning.deleteMany({
          where: { chatId: ctx.chat.id, senderChatId: candidateSenderChat?.id ?? null, userId: candidate.id },
        }),
      ]);
      if (isChatMemberBanned || isSenderChatBanned) {
        await ctx.reply(t("warnings:banned"), { parse_mode: "HTML", reply_parameters: { message_id: replyMessageId } });
      }
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
      this.logger.error("Chat is not defined to render warnings settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(chat);
    const hasWarnings = this.sanitizeValue(chat.settings.hasWarnings);
    const value = hasWarnings ? t("warnings:enabled") : t("warnings:disabled");
    const msg = t("warnings:set", { CHAT: chatLink, VALUE: value });
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.HAS_WARNINGS,
      timeZone: settings.timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                callback_data: buildCbData({ action: WarningsAction.SAVE, chatId, value: true }),
                text: t("warnings:enable"),
              },
            ],
            [{ callback_data: buildCbData({ action: WarningsAction.SAVE, chatId }), text: t("warnings:disable") }],
            this.settingsService.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes warnings rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: boolean | string | null): true | null {
    if (typeof value === "string") {
      return value.toLowerCase() === "true" ? true : null;
    }
    return value ? true : null;
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Warnings state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save warnings settings");
      return;
    }

    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(settings.language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const hasWarnings = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chatSettings.update({ data: { hasWarnings }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.HAS_WARNINGS),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}
