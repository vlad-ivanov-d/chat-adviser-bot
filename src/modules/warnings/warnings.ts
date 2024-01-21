import { ChatSettingName } from "@prisma/client";
import { CronJob } from "cron";
import { changeLanguage, t } from "i18next";
import type { Database } from "modules/database";
import type { Settings } from "modules/settings";
import type { Telegraf } from "telegraf";
import { callbackQuery } from "telegraf/filters";
import type { BasicModule } from "types/basicModule";
import type { CallbackCtx, TextMessageCtx } from "types/telegrafContext";
import { getCallbackQueryParams, getChatHtmlLink, getUserOrChatHtmlLink, isChatAdmin } from "utils/telegraf";

import { DELETE_MESSAGE_DELAY, OUTDATED_WARNING_TIMEOUT, WARNINGS_LIMIT } from "./warnings.constants";
import { WarningsAction } from "./warnings.types";

export class Warnings implements BasicModule {
  private cleanupCronJob?: CronJob;

  /**
   * Creates warnings module
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
   * Initiates warnings module
   */
  public init(): void {
    this.bot.hears("/warn", (ctx) => this.warnCommand(ctx));
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
      const { action, chatId, value } = getCallbackQueryParams(ctx);
      switch (action) {
        case WarningsAction.SAVE:
          await this.saveSettings(ctx, chatId, value);
          break;
        case WarningsAction.SETTINGS:
          await this.renderSettings(ctx, chatId);
          break;
        default:
          await next();
      }
    });
    this.cleanupCronJob = new CronJob(
      "0 0 0 * * *", // Every day at 00:00:00
      () => {
        void (async () => {
          await this.deleteOutdatedWarnings();
        })();
      },
      null,
      true,
    );
  }

  /**
   * Shutdowns messages module
   */
  public shutdown(): void {
    this.cleanupCronJob?.stop();
  }

  /**
   * Applies penalties for exceeding the warning limit.
   * @param ctx Text message context
   */
  private async applyPenalties(ctx: TextMessageCtx): Promise<void> {
    const { from, sender_chat: senderChatId } = ctx.message.reply_to_message ?? {};
    await Promise.all([
      from &&
        this.database.warning.deleteMany({
          where: { chatId: ctx.chat.id, senderChatId: senderChatId?.id, userId: from.id },
        }),
      // An expected error may happen when bot has no enough permissions
      senderChatId && ctx.banChatSenderChat(senderChatId.id).catch(() => false),
      !senderChatId && from && ctx.banChatMember(from.id).catch(() => false),
    ]);
  }

  /**
   * Deletes outdated warnings
   */
  private async deleteOutdatedWarnings(): Promise<void> {
    const date = new Date(Date.now() - OUTDATED_WARNING_TIMEOUT);
    await this.database.warning.deleteMany({ where: { createdAt: { lt: date } } });
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
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render warnings settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settings.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const hasWarnings = this.sanitizeValue(dbChat.hasWarnings);
    const value = this.getOptions().find((o) => o.id === hasWarnings)?.title ?? "";
    const msg = t("warnings:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.database.joinModifiedInfo(msg, ChatSettingName.HAS_WARNINGS, dbChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `${WarningsAction.SAVE}?chatId=${chatId}&v=true`, text: t("warnings:enable") }],
            [{ callback_data: `${WarningsAction.SAVE}?chatId=${chatId}`, text: t("warnings:disable") }],
            this.settings.getBackToFeaturesButton(chatId),
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
      throw new Error("Chat is not defined to save warnings settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settings.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const hasWarnings = this.sanitizeValue(value);

    await this.database.$transaction([
      this.database.chat.update({ data: { hasWarnings }, select: { id: true }, where: { id: chatId } }),
      this.database.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.HAS_WARNINGS),
    ]);
    await Promise.all([this.settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Processes /warn command
   * @param ctx Text message context
   */
  private async warnCommand(ctx: TextMessageCtx): Promise<void> {
    const { from, message_id: messageId, reply_to_message: replyToMessage, sender_chat: senderChat } = ctx.message;
    const candidate = replyToMessage?.from;
    const candidateSenderChat = replyToMessage?.sender_chat;
    const isCandidateAutomaticForward =
      !!replyToMessage && "is_automatic_forward" in replyToMessage && !!replyToMessage.is_automatic_forward;

    if (ctx.message.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return; // Private chat, return.
    }

    const [chat, isCandidateAdmin] = await Promise.all([
      this.database.upsertChat(ctx.chat, from),
      typeof candidate?.id === "number" && !candidateSenderChat
        ? // Check seperately, because other bots are not included in admin list.
          isChatAdmin(ctx.telegram, ctx.chat.id, candidate.id)
        : candidateSenderChat?.id === ctx.chat.id,
    ]);
    await changeLanguage(chat.language);

    if (!chat.hasWarnings) {
      return; // The feature is disabled, return.
    }
    if (!this.database.isChatAdmin(chat, ctx.botInfo.id)) {
      await ctx.reply(t("common:needAdminPermissions"), { reply_to_message_id: messageId });
      return; // Bot is not an admin, return.
    }
    if (!this.database.isChatAdmin(chat, from.id, senderChat?.id)) {
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
    if (isCandidateAutomaticForward || isCandidateAdmin) {
      await ctx.reply(t("warnings:cannotWarnAdmin"), { reply_to_message_id: messageId });
      return; // Candidate is an admin, return.
    }

    await Promise.all([
      this.deleteOutdatedWarnings(),
      candidateSenderChat && this.database.upsertSenderChat(candidateSenderChat, from),
      // An expected error may happen when bot has no enough permissions
      ctx.deleteMessage(messageId).catch(() => false),
    ]);

    const isWarningExist = await this.database.warning.findFirst({
      select: { id: true },
      where: { chatId: chat.id, messageId: replyToMessage.message_id, userId: from.id },
    });
    if (isWarningExist) {
      return; // The warning has been already issued for this message, return.
    }

    const [, , warnings] = await this.database.$transaction([
      this.database.upsertUser(candidate, from),
      this.database.warning.create({
        data: {
          authorId: from.id,
          chatId: chat.id,
          editorId: from.id,
          messageId: replyToMessage.message_id,
          senderChatId: candidateSenderChat?.id,
          userId: candidate.id,
        },
        select: { id: true },
      }),
      this.database.warning.findMany({
        select: { id: true },
        where: { chatId: chat.id, senderChatId: candidateSenderChat?.id, userId: candidate.id },
      }),
    ]);

    const candidateLink = getUserOrChatHtmlLink(candidate, candidateSenderChat);
    const msg = t("warnings:text", { USER: candidateLink, WARNINGS_COUNT: warnings.length, WARNINGS_LIMIT });
    await ctx.sendMessage(msg, {
      parse_mode: "HTML",
      reply_to_message_id: replyToMessage.message_id,
    });

    // Delete the message with a delay to let users know the reason
    setTimeout(() => {
      // An expected error may happen when bot has no enough permissions
      ctx.deleteMessage(replyToMessage.message_id).catch(() => false);
    }, DELETE_MESSAGE_DELAY);

    if (warnings.length >= WARNINGS_LIMIT) {
      await this.applyPenalties(ctx);
    }
  }
}
