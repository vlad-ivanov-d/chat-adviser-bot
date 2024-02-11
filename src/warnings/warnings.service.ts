import { Injectable } from "@nestjs/common";
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
  /**
   * Creates warnings service
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
    await this.deleteOutdatedWarnings();
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
    const isCandidateAutomaticForward =
      !!replyToMessage && "is_automatic_forward" in replyToMessage && !!replyToMessage.is_automatic_forward;

    if (ctx.message.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return; // Private chat, return.
    }

    const [candidateMember, chat] = await Promise.all([
      typeof candidate?.id === "number" && !candidateSenderChat
        ? // An expected error may happen if the bot have no permissions to see the member list.
          ctx.telegram.getChatMember(ctx.chat.id, candidate.id).catch(() => undefined)
        : undefined,
      this.prismaService.upsertChat(ctx.chat, from),
    ]);
    await changeLanguage(chat.language);

    if (!chat.hasWarnings) {
      return; // The feature is disabled, return.
    }
    if (!this.prismaService.isChatAdmin(chat, ctx.botInfo.id)) {
      await ctx.reply(t("common:needAdminPermissions"), { reply_to_message_id: messageId });
      return; // Bot is not an admin, return.
    }
    if (!this.prismaService.isChatAdmin(chat, from.id, senderChat?.id)) {
      await ctx.reply(t("common:commandForAdmins"), { reply_to_message_id: messageId });
      return; // The user is not an admin, return.
    }
    if (!candidate) {
      await ctx.reply(t("warnings:replyToSomeonesMessage"), { reply_to_message_id: messageId });
      return; // No candidate, return.
    }
    if (candidate.id === ctx.botInfo.id) {
      await ctx.reply(t("warnings:cannotWarnMyself"), { reply_to_message_id: messageId });
      return; // Candidate is the bot itself, return.
    }
    if (
      isCandidateAutomaticForward ||
      candidateMember?.status === "administrator" ||
      candidateMember?.status === "creator" ||
      candidateSenderChat?.id === ctx.chat.id
    ) {
      await ctx.reply(t("warnings:cannotWarnAdmin"), { reply_to_message_id: messageId });
      return; // Candidate is an admin, return.
    }

    await Promise.all([
      this.deleteOutdatedWarnings(),
      // An expected error may happen when bot has no enough permissions
      ctx.deleteMessage(messageId).catch(() => false),
    ]);

    // Delete the message with a delay to let users know the reason
    setTimeout(() => {
      // An expected error may happen when bot has no enough permissions
      ctx.deleteMessage(replyToMessage.message_id).catch(() => false);
    }, DELETE_MESSAGE_DELAY);

    const existedWarning = await this.prismaService.warning.findFirst({
      select: { id: true },
      where: {
        chatId: chat.id,
        messageId: replyToMessage.message_id,
        senderChatId: candidateSenderChat?.id ?? null,
        userId: candidate.id,
      },
    });
    if (candidateMember?.status === "kicked" || existedWarning) {
      return;
    }

    await this.warn(ctx, { candidate, candidateMessageId: replyToMessage.message_id, candidateSenderChat });
  }

  /**
   * Issues the warning without additional checks
   * @param ctx Text message context
   * @param options Options to warn
   */
  private async warn(ctx: TextMessageCtx, options: WarnOptions): Promise<void> {
    const { candidate, candidateMessageId, candidateSenderChat } = options;
    if (candidateSenderChat) {
      await this.prismaService.upsertSenderChat(candidateSenderChat, ctx.from);
    }
    const [, , warnings] = await this.prismaService.$transaction([
      this.prismaService.upsertUser(candidate, ctx.from),
      this.prismaService.warning.create({
        data: {
          authorId: ctx.from.id,
          chatId: ctx.chat.id,
          editorId: ctx.from.id,
          messageId: candidateMessageId,
          senderChatId: candidateSenderChat?.id ?? null,
          userId: candidate.id,
        },
        select: { id: true },
      }),
      this.prismaService.warning.findMany({
        select: { id: true },
        where: { chatId: ctx.chat.id, senderChatId: candidateSenderChat?.id ?? null, userId: candidate.id },
      }),
    ]);

    const candidateLink = getUserOrChatHtmlLink(candidate, candidateSenderChat);
    const { message_id: replyMessageId } = await ctx.reply(
      t("warnings:text", { USER: candidateLink, WARNINGS_COUNT: warnings.length, WARNINGS_LIMIT }),
      {
        parse_mode: "HTML",
        reply_to_message_id: candidateMessageId,
      },
    );

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
        const msg = t("warnings:banned", { USER: candidateLink });
        await ctx.reply(msg, { parse_mode: "HTML", reply_to_message_id: replyMessageId });
      }
    }
  }

  /**
   * Deletes outdated warnings
   */
  private async deleteOutdatedWarnings(): Promise<void> {
    const date = new Date(Date.now() - OUTDATED_WARNING_TIMEOUT);
    await this.prismaService.warning.deleteMany({ where: { createdAt: { lt: date } } });
  }

  /**
   * Gets available warnings options
   * @returns Warnings options
   */
  private getOptions(): { id: true | null; title: string }[] {
    return [
      { id: true, title: t("warnings:enabled") },
      { id: null, title: t("warnings:disabled") },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param sendAnswerCallback Answer callback query will be sent if true
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number, sendAnswerCallback?: boolean): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Chat is not defined to render warnings settings
    }

    const { language } = await this.prismaService.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const hasWarnings = this.sanitizeValue(dbChat.hasWarnings);
    const value = this.getOptions().find((o) => o.id === hasWarnings)?.title ?? "";
    const msg = t("warnings:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      sendAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(this.prismaService.joinModifiedInfo(msg, ChatSettingName.HAS_WARNINGS, dbChat), {
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
      return; // Chat is not defined to save warnings settings
    }

    const { language } = await this.prismaService.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const hasWarnings = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { hasWarnings }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.HAS_WARNINGS),
    ]);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }
}