import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ChatSettingName, type User } from "@prisma/client";
import { changeLanguage, t, type TOptions } from "i18next";
import { Ctx, Hears, On, Update } from "nestjs-telegraf";
import type { User as TelegramUser } from "telegraf/typings/core/types/typegram";

import { MAX_INT } from "src/prisma/prisma.constants";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, TextMessageCtx } from "src/types/telegraf-context";
import {
  buildCbData,
  getChatHtmlLink,
  getUserHtmlLink,
  getUserOrChatHtmlLink,
  isChatAdmin,
  isChatMember,
  parseCbData,
} from "src/utils/telegraf";

import { VotebanAction } from "./interfaces/action.interface";
import type { VotebanRenderSettingsOptions } from "./interfaces/settings-options.interface";
import { EXPIRED_VOTEBAN_TIMEOUT, VOTEBAN_DELAY } from "./voteban.constants";

@Update()
@Injectable()
export class VotebanService {
  private readonly logger = new Logger(VotebanService.name);

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
   * Handles callback query related to voteban
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, valueNum } = parseCbData(ctx);
    switch (action) {
      case VotebanAction.BAN:
      case VotebanAction.NO_BAN:
        await this.vote(ctx, action);
        break;
      case VotebanAction.SAVE:
        await this.saveSettings(ctx, chatId, valueNum);
        break;
      case VotebanAction.SETTINGS:
        await this.renderSettings(ctx, { chatId, shouldAnswerCallback: true, value: valueNum });
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
    const date = new Date(Date.now() - EXPIRED_VOTEBAN_TIMEOUT);
    const { count } = await this.prismaService.voteban.deleteMany({ where: { createdAt: { lt: date } } });
    this.logger.log(`Number of deleted expired votebans: ${count.toString()}`);
  }

  /**
   * Provides the ability to vote for ban. The command to start voting must be strict,
   * but case-insensitive: "/voteban" or "voteban".
   * @param ctx Text message context
   */
  @Hears(/^(\/)?voteban$/i)
  public async votebanCommand(@Ctx() ctx: TextMessageCtx): Promise<void> {
    if (ctx.message.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return;
    }

    const { from, message_id: messageId, sender_chat: senderChat, reply_to_message: replyToMessage } = ctx.message;
    const candidate = replyToMessage?.from;
    const candidateSenderChat = replyToMessage?.sender_chat;

    const [chat, isCandidateAdmin, isVotingStarted] = await Promise.all([
      this.prismaService.upsertChatWithCache(ctx.chat, from),
      typeof candidate?.id === "number" && !candidateSenderChat
        ? // Check seperately, because other bots are not included in admin list.
          isChatAdmin(ctx.telegram, ctx.chat.id, candidate.id)
        : candidateSenderChat?.id === ctx.chat.id,
      this.checkIsVotingStarted(ctx.message),
    ]);
    await changeLanguage(chat.language);

    if (!chat.votebanLimit) {
      return; // The feature is disabled, return.
    }
    if (!this.prismaService.isChatAdmin(chat, ctx.botInfo.id)) {
      await ctx.reply(t("common:needAdminPermissions"), { reply_parameters: { message_id: messageId } });
      return; // Bot is not an admin, return.
    }
    if (!candidate) {
      await ctx.reply(t("voteban:replyToSomeonesMessage"), { reply_parameters: { message_id: messageId } });
      return; // No candidate, return.
    }
    if (candidate.id === ctx.botInfo.id) {
      await ctx.reply(t("voteban:cannotVoteAgainstMyself"), { reply_parameters: { message_id: messageId } });
      return; // Candidate is the bot itself, return.
    }
    if ("is_automatic_forward" in replyToMessage || isCandidateAdmin) {
      await ctx.reply(t("voteban:cannotVoteAgainstAdmin"), { reply_parameters: { message_id: messageId } });
      return; // Candidate is an admin, return.
    }
    if (isVotingStarted) {
      await ctx.reply(t("voteban:alreadyStarted"), { reply_parameters: { message_id: messageId } });
      return; // Voting has already started, return.
    }

    const authorLink = getUserOrChatHtmlLink(from, senderChat);
    const candidateLink = getUserOrChatHtmlLink(candidate, candidateSenderChat);
    // Do not accept vote from sender chat
    const banButtonText = t("voteban:banWithCounter", { LIMIT: chat.votebanLimit, VOTES: senderChat ? 0 : 1 });
    const noBanButtonText = t("voteban:noBanWithCounter", { LIMIT: chat.votebanLimit, VOTES: 0 });

    const [reply] = await Promise.all([
      ctx.reply(t("voteban:question", { AUTHOR: authorLink, CANDIDATE: candidateLink, count: chat.votebanLimit }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: VotebanAction.BAN, text: banButtonText }],
            [{ callback_data: VotebanAction.NO_BAN, text: noBanButtonText }],
          ],
        },
        reply_parameters: { allow_sending_without_reply: true, message_id: replyToMessage.message_id },
      }),
      this.prismaService.upsertUser(from, from),
    ]);

    await Promise.all([
      candidateSenderChat && this.prismaService.upsertSenderChat(candidateSenderChat, from),
      senderChat && this.prismaService.upsertSenderChat(senderChat, from),
    ]);

    const [, voting] = await this.prismaService.$transaction([
      this.prismaService.upsertUser(candidate, from),
      this.prismaService.voteban.create({
        data: {
          authorId: from.id,
          authorSenderChatId: senderChat?.id,
          // Do not accept vote from sender chat
          banVoters: senderChat ? undefined : { create: { authorId: from.id, editorId: from.id } },
          candidateId: candidate.id,
          candidateMediaGroupId: "media_group_id" in replyToMessage ? replyToMessage.media_group_id : null,
          candidateMessageId: replyToMessage.message_id,
          candidateSenderChatId: candidateSenderChat?.id,
          chatId: chat.id,
          editorId: from.id,
          messageId: reply.message_id,
        },
        select: { id: true },
      }),
    ]);
    this.logger.log(`Voting started: ${voting.id}`);
  }

  /**
   * Deletes messages which are related to message id and media group id
   * @param ctx Callback context
   * @param messageId Message id which should be deleted
   * @param mediaGroupId Media group id should will be deleted
   */
  private async deleteMessages(ctx: CallbackCtx, messageId?: number, mediaGroupId?: string | null): Promise<void> {
    const mediaGroupMessages = mediaGroupId
      ? await this.prismaService.message.findMany({
          select: { messageId: true },
          where: { chatId: ctx.chat?.id, mediaGroupId, messageId: { not: messageId } },
        })
      : [];
    const deleteIds = [messageId, ...mediaGroupMessages.map((m) => m.messageId)].filter(
      (id): id is number => typeof id === "number",
    );
    const isDeleted = deleteIds.length > 0 ? await ctx.deleteMessages(deleteIds).catch(() => false) : false;
    if (isDeleted) {
      await this.prismaService.message.deleteMany({ where: { messageId: { in: deleteIds } } });
    }
  }

  /**
   * Gets user links as HTML
   * @param users Users
   * @returns User links
   */
  private getUserLinks(users: (User | TelegramUser)[]): string {
    let result = "";
    for (const user of users) {
      const link = getUserHtmlLink(user);
      if (!result) {
        result += link;
        continue;
      }
      if (`${result}, ${link}`.length <= 2000) {
        result += `, ${link}`;
        continue;
      }
      return t("voteban:trimmedUsers", { USERS: result });
    }
    return result;
  }

  /**
   * Checks if there is already a recently started voting against this message
   * @param message Message from context
   * @returns True if the same voting exists
   */
  private async checkIsVotingStarted(message: TextMessageCtx["message"]): Promise<boolean> {
    if (message.reply_to_message) {
      const candidateMediaGroupId =
        "media_group_id" in message.reply_to_message ? message.reply_to_message.media_group_id : null;
      const voting = await this.prismaService.voteban.findFirst({
        select: { id: true },
        where: {
          OR: [{ candidateMediaGroupId }, { candidateMessageId: message.reply_to_message.message_id }],
          chatId: message.chat.id,
          createdAt: { gt: new Date(Date.now() - VOTEBAN_DELAY) },
        },
      });
      return !!voting;
    }
    return false;
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param options Render options
   */
  private async renderSettings(ctx: CallbackCtx, options: VotebanRenderSettingsOptions): Promise<void> {
    const { chatId, shouldAnswerCallback, value } = options;
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to render voteban settings");
      return;
    }

    const { language, timeZone } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(chat);
    const { votebanLimit } = chat;
    const newValue = this.sanitizeValue(typeof value === "undefined" || isNaN(value) ? votebanLimit : value);
    const tip = t("voteban:tip");
    const msg = t("voteban:setLimit", { CHAT: chatLink, TIP: tip, count: newValue });
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.VOTEBAN_LIMIT,
      timeZone,
    });

    await Promise.all([
      shouldAnswerCallback && ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                callback_data: buildCbData({ action: VotebanAction.SETTINGS, chatId, value: newValue - 1 }),
                text: "-1",
              },
              {
                // Value can't be equal to 1
                callback_data: buildCbData({
                  action: VotebanAction.SETTINGS,
                  chatId,
                  value: Math.max(2, newValue + 1),
                }),
                text: "+1",
              },
            ],
            [
              {
                callback_data: buildCbData({ action: VotebanAction.SETTINGS, chatId, value: newValue - 50 }),
                text: "-50",
              },
              {
                callback_data: buildCbData({ action: VotebanAction.SETTINGS, chatId, value: newValue + 50 }),
                text: "+50",
              },
            ],
            [
              {
                callback_data: buildCbData({ action: VotebanAction.SAVE, chatId, value: newValue }),
                text: t("settings:save"),
              },
            ],
            this.settingsService.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Sanitizes voteban limit value
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: number | null): number {
    return value === null || isNaN(value) || value === 1 ? 0 : Math.max(0, Math.min(MAX_INT, value));
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Voteban limit value
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      this.logger.error("Chat is not defined to save voteban settings");
      return;
    }

    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const votebanLimit = this.sanitizeValue(value) || null;
    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { votebanLimit }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.VOTEBAN_LIMIT),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, { chatId })]);
  }

  /**
   * Update voting results
   * @param ctx Callback context
   */
  private async updateResults(ctx: CallbackCtx): Promise<void> {
    const { from, message } = ctx.update.callback_query;
    if (!message) {
      throw new Error("Message is not defined to update results of voteban.");
    }

    const [chat, voting] = await Promise.all([
      this.prismaService.upsertChatWithCache(message.chat, from),
      this.prismaService.voteban.findUniqueOrThrow({
        select: {
          author: true,
          authorSenderChat: true,
          banVoters: { orderBy: { createdAt: "asc" }, select: { author: true } },
          candidate: true,
          candidateMediaGroupId: true,
          candidateSenderChat: true,
          id: true,
          noBanVoters: { orderBy: { createdAt: "asc" }, select: { author: true } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);
    await changeLanguage(chat.language);

    const { author, authorSenderChat, banVoters, candidate, candidateMediaGroupId, candidateSenderChat, noBanVoters } =
      voting;
    const authorLink = getUserOrChatHtmlLink(author, authorSenderChat);
    const candidateLink = getUserOrChatHtmlLink(candidate, candidateSenderChat);
    const isBan = banVoters.length > noBanVoters.length;
    const voteUsers = (isBan ? banVoters : noBanVoters).map((v) => v.author);
    const voteUserLinks = this.getUserLinks(voteUsers);
    const tOptions: TOptions = { AUTHOR: authorLink, CANDIDATE: candidateLink, USERS: voteUserLinks };
    const questionMsg = t("voteban:question", { ...tOptions, count: chat.votebanLimit ?? 0 });

    if (!chat.votebanLimit) {
      const cancelledMsg = t("voteban:cancelledFeatureDisabled");
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // The feature is disabled, return.
    }
    if (!this.prismaService.isChatAdmin(chat, ctx.botInfo.id)) {
      const cancelledMsg = t("voteban:cancelledBotNotAdmin");
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // Bot is not an admin, return.
    }
    // Check it seperately, because other admin bots are not included in the chat admin list.
    const isCandidateAdmin = await isChatAdmin(ctx.telegram, message.chat.id, candidate.id);
    if (isCandidateAdmin) {
      const cancelledMsg = t("voteban:cancelledVotingAgainstAdmin");
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // Candidate is an admin, return.
    }
    if (voteUsers.length >= chat.votebanLimit) {
      const candidateMessageId = "reply_to_message" in message ? message.reply_to_message?.message_id : undefined;
      const resultsMsg = isBan ? t("voteban:banResults", tOptions) : t("voteban:noBanResults", tOptions);
      this.logger.log(`Voting completed: ${voting.id}`);
      await Promise.all([
        this.prismaService.voteban.delete({
          select: { id: true },
          where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
        }),
        ctx.editMessageText([questionMsg, resultsMsg].join("\n\n———\n\n"), { parse_mode: "HTML" }),
        ctx.reply(t("voteban:completed"), { reply_parameters: { message_id: message.message_id } }),
        isBan && this.deleteMessages(ctx, candidateMessageId, candidateMediaGroupId),
        // An expected error may happen if there are no enough permissions
        isBan && candidateSenderChat && ctx.banChatSenderChat(candidateSenderChat.id).catch(() => false),
        isBan && !candidateSenderChat && ctx.banChatMember(candidate.id).catch(() => false),
      ]);
      return; // Voting completed, return.
    }

    const banButtonText = t("voteban:banWithCounter", { LIMIT: chat.votebanLimit, VOTES: banVoters.length });
    const noBanButtonText = t("voteban:noBanWithCounter", { LIMIT: chat.votebanLimit, VOTES: noBanVoters.length });
    await ctx.editMessageText(questionMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ callback_data: buildCbData({ action: VotebanAction.BAN }), text: banButtonText }],
          [{ callback_data: buildCbData({ action: VotebanAction.NO_BAN }), text: noBanButtonText }],
        ],
      },
    });
  }

  /**
   * Saves the user's choice
   * @param ctx Callback context
   * @param action User action
   */
  private async vote(ctx: CallbackCtx, action: VotebanAction): Promise<void> {
    const { from, message } = ctx.update.callback_query;
    if (!message) {
      throw new Error("Message is not defined to save the vote for voteban.");
    }

    const [existedChat, voting] = await this.prismaService.$transaction([
      this.prismaService.chat.findUnique({ select: { id: true }, where: { id: message.chat.id } }),
      this.prismaService.voteban.findUnique({
        select: {
          banVoters: { select: { authorId: true }, where: { authorId: from.id } },
          id: true,
          noBanVoters: { select: { authorId: true }, where: { authorId: from.id } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);

    // Do not upsert chat if it's not found. It means that bot was removed from the chat.
    const chat = existedChat ? await this.prismaService.upsertChatWithCache(message.chat, from) : undefined;
    const lng = chat?.language ?? this.prismaService.resolveLanguage(from.language_code);
    await changeLanguage(lng);
    if (!chat || !voting) {
      await ctx.answerCbQuery(t("voteban:expired"), { show_alert: true });
      return; // Voting not found. It has been deleted.
    }

    const { banVoters, id, noBanVoters } = voting;
    if ((action === VotebanAction.BAN ? banVoters : noBanVoters).some((v) => v.authorId === from.id)) {
      await ctx.answerCbQuery(t("voteban:alreadyVoted"), { show_alert: true });
      return; // User has already voted, return.
    }
    if (!this.prismaService.isChatAdmin(chat, ctx.botInfo.id)) {
      const msg = t("common:needAdminPermissions");
      // An expected error may happen when bot was removed from the chat or there are no enough permissions
      await Promise.all([ctx.answerCbQuery(msg, { show_alert: true }), this.updateResults(ctx).catch(() => undefined)]);
      return; // Bot is not an admin, return.
    }
    const isVoterChatMember = await isChatMember(ctx.telegram, message.chat.id, from.id);
    if (!isVoterChatMember) {
      await ctx.answerCbQuery(t("voteban:mustBeChatMember"), { show_alert: true });
      return; // Voter is not a chat member, return.
    }
    if (action === VotebanAction.BAN) {
      await this.prismaService.$transaction([
        this.prismaService.upsertUser(from, from),
        this.prismaService.votebanBanVoter.create({
          data: { authorId: from.id, editorId: from.id, votebanId: id },
          select: { id: true },
        }),
        this.prismaService.votebanNoBanVoter.deleteMany({ where: { authorId: from.id, votebanId: id } }),
      ]);
    }
    if (action === VotebanAction.NO_BAN) {
      await this.prismaService.$transaction([
        this.prismaService.upsertUser(from, from),
        this.prismaService.votebanNoBanVoter.create({
          data: { authorId: from.id, editorId: from.id, votebanId: id },
          select: { id: true },
        }),
        this.prismaService.votebanBanVoter.deleteMany({ where: { authorId: from.id, votebanId: id } }),
      ]);
    }
    // An expected error may happen when bot was removed from the chat or there are no enough permissions
    await Promise.all([ctx.answerCbQuery(t("voteban:voteCounted")), this.updateResults(ctx).catch(() => undefined)]);
  }
}
