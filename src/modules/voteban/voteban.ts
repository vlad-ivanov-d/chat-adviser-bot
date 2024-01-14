import { ChatSettingName, ChatType, type User } from "@prisma/client";
import { CronJob } from "cron";
import { changeLanguage, t, type TOptions } from "i18next";
import { type Database, MAX_INT } from "modules/database";
import type { Settings } from "modules/settings";
import type { Telegraf } from "telegraf";
import { callbackQuery } from "telegraf/filters";
import type { User as TelegramUser } from "telegraf/typings/core/types/typegram";
import type { BasicModule } from "types/basicModule";
import type { CallbackCtx, TextMessageCtx } from "types/telegrafContext";
import {
  getCallbackQueryParams,
  getChatHtmlLink,
  getUserHtmlLink,
  getUserOrChatHtmlLink,
  isChatAdmin,
  isChatMember,
} from "utils/telegraf";

import { EXPIRED_VOTEBAN_TIMEOUT } from "./voteban.constants";
import { VotebanAction } from "./voteban.types";

export class Voteban implements BasicModule {
  private cleanupCronJob?: CronJob;

  /**
   * Creates voteban module
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
   * Initiates voteban module
   */
  public init(): void {
    this.cleanupCronJob = new CronJob(
      "0 0 0 * * *", // Every day at 00:00:00
      () => {
        void (async () => {
          const date = new Date(Date.now() - EXPIRED_VOTEBAN_TIMEOUT);
          await this.database.voteban.deleteMany({ where: { createdAt: { lt: date } } });
        })();
      },
      null,
      true,
    );
    this.bot.hears(/^(\/)?voteban$/i, (ctx) => this.votebanCommand(ctx));
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
      const { action, chatId, valueNum } = getCallbackQueryParams(ctx);
      switch (action) {
        case VotebanAction.BAN:
        case VotebanAction.NO_BAN:
          await this.vote(ctx, action);
          break;
        case VotebanAction.SAVE:
          await this.saveSettings(ctx, chatId, valueNum);
          break;
        case VotebanAction.SETTINGS:
          await this.renderSettings(ctx, chatId, valueNum);
          break;
        default:
          await next();
      }
    });
  }

  /**
   * Shutdowns voteban module
   */
  public shutdown(): void {
    this.cleanupCronJob?.stop();
  }

  /**
   * Deletes messages which are related to message id and media group id
   * @param ctx Callback context
   * @param messageId Message id which should be deleted
   * @param mediaGroupId Media group id should will be deleted
   */
  private async deleteMessages(ctx: CallbackCtx, messageId?: number, mediaGroupId?: string | null): Promise<void> {
    const mediaGroupMessages = mediaGroupId
      ? await this.database.message.findMany({
          select: { messageId: true },
          where: { chatId: ctx.chat?.id, mediaGroupId, messageId: { not: messageId } },
        })
      : [];
    const toDeleteIds = [messageId, ...mediaGroupMessages.map((m) => m.messageId)].filter(
      (id): id is number => typeof id === "number",
    );
    const deletionResult = await Promise.all(
      toDeleteIds.map(async (id) => {
        const isDeleted = await ctx.deleteMessage(id).catch(() => false);
        return isDeleted ? id : undefined;
      }),
    );
    const deletedIds = deletionResult.filter((id): id is number => typeof id === "number");
    if (deletedIds.length > 0) {
      await this.database.message.deleteMany({ where: { messageId: { in: deletedIds } } });
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
      if (`${result}, ${link}`.length <= 2500) {
        result += `, ${link}`;
        continue;
      }
      return t("voteban:trimmedUsers", { USERS: result });
    }
    return result;
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Voteban limit value
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number, value?: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render voteban settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settings.resolveDatabaseChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(dbChat);
    const { votebanLimit } = dbChat;
    const newValue = this.sanitizeValue(typeof value === "undefined" || isNaN(value) ? votebanLimit : value);
    const tip = t("voteban:tip");
    const msg = t("voteban:setLimit", { CHAT: chatLink, TIP: tip, count: newValue });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.database.joinModifiedInfo(msg, ChatSettingName.VOTEBAN_LIMIT, dbChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { callback_data: `${VotebanAction.SETTINGS}?chatId=${chatId}&v=${newValue - 1}`, text: "-1" },
              {
                // Value can't be equal to 1
                callback_data: `${VotebanAction.SETTINGS}?chatId=${chatId}&v=${Math.max(2, newValue + 1)}`,
                text: "+1",
              },
            ],
            [
              { callback_data: `${VotebanAction.SETTINGS}?chatId=${chatId}&v=${newValue - 50}`, text: "-50" },
              { callback_data: `${VotebanAction.SETTINGS}?chatId=${chatId}&v=${newValue + 50}`, text: "+50" },
            ],
            [
              {
                callback_data: `${VotebanAction.SAVE}?chatId=${chatId}&v=${newValue}`,
                text: t("settings:save"),
              },
            ],
            this.settings.getBackToFeaturesButton(chatId),
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
      throw new Error("Chat is not defined to save voteban settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settings.resolveDatabaseChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const votebanLimit = this.sanitizeValue(value) || null;
    await this.database.$transaction([
      this.database.chat.update({ data: { votebanLimit }, select: { id: true }, where: { id: chatId } }),
      this.database.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.VOTEBAN_LIMIT),
    ]);
    await Promise.all([this.settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
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
      this.database.upsertChat(message.chat, from),
      this.database.voteban.findUniqueOrThrow({
        select: {
          author: true,
          authorSenderChat: true,
          banVoters: { orderBy: { createdAt: "asc" }, select: { author: true } },
          candidate: true,
          candidateSenderChat: true,
          mediaGroupId: true,
          noBanVoters: { orderBy: { createdAt: "asc" }, select: { author: true } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);
    await changeLanguage(chat.language);

    const { author, authorSenderChat, banVoters, candidate, candidateSenderChat, mediaGroupId, noBanVoters } = voting;
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
    if (!this.database.isChatAdmin(chat, ctx.botInfo.id)) {
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
      await Promise.all([
        this.database.voteban.update({
          data: { isCompleted: true },
          select: { id: true },
          where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
        }),
        ctx.editMessageText([questionMsg, resultsMsg].join("\n\n"), { parse_mode: "HTML" }),
        ctx.reply(t("voteban:completed"), { reply_to_message_id: message.message_id }),
        // An expected error may happen if there are no enough permissions
        isBan && this.deleteMessages(ctx, candidateMessageId, mediaGroupId),
        isBan && candidateSenderChat && ctx.banChatSenderChat(candidateSenderChat.id).catch(() => undefined),
        isBan && !candidateSenderChat && ctx.banChatMember(candidate.id).catch(() => undefined),
      ]);
      return; // Voting completed, return.
    }

    const banButtonText = t("voteban:banWithCounter", { LIMIT: chat.votebanLimit, VOTES: banVoters.length });
    const noBanButtonText = t("voteban:noBanWithCounter", { LIMIT: chat.votebanLimit, VOTES: noBanVoters.length });
    await ctx.editMessageText(questionMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ callback_data: VotebanAction.BAN, text: banButtonText }],
          [{ callback_data: VotebanAction.NO_BAN, text: noBanButtonText }],
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

    const [isChatExists, isVoterChatMember, voting] = await Promise.all([
      this.database.isChatExists(message.chat.id),
      isChatMember(ctx.telegram, message.chat.id, from.id),
      this.database.voteban.findUnique({
        select: {
          banVoters: { select: { authorId: true }, where: { authorId: from.id } },
          id: true,
          noBanVoters: { select: { authorId: true }, where: { authorId: from.id } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);

    // Do not upsert chat if it's not found. It means that bot was removed from the chat.
    const chat = isChatExists ? await this.database.upsertChat(message.chat, from) : undefined;
    const lng = chat?.language ?? this.database.resolveLanguage(from.language_code);
    await changeLanguage(lng);
    if (!chat || !voting) {
      await ctx.answerCbQuery(t("voteban:expired"), { show_alert: true });
      return; // Voting not found. It has been deleted.
    }

    const { banVoters, id, noBanVoters } = voting;
    const { editorId } = chat;
    if ((action === VotebanAction.BAN ? banVoters : noBanVoters).map((v) => v.authorId).includes(from.id)) {
      await ctx.answerCbQuery(t("voteban:alreadyVoted"), { show_alert: true });
      return; // User has already voted, return.
    }
    if (!this.database.isChatAdmin(chat, ctx.botInfo.id)) {
      const msg = t("common:needAdminPermissions");
      // An expected error may happen when bot was removed from the chat or there are no enough permissions
      await Promise.all([ctx.answerCbQuery(msg, { show_alert: true }), this.updateResults(ctx).catch(() => undefined)]);
      return; // Bot is not an admin, return.
    }
    if (!isVoterChatMember) {
      await ctx.answerCbQuery(t("voteban:mustBeChatMember"), { show_alert: true });
      return; // Voter is not a chat member, return.
    }
    if (action === VotebanAction.BAN) {
      await this.database.$transaction([
        this.database.votebanBanVoter.create({
          data: { authorId: editorId, editorId, votebanId: id },
          select: { id: true },
        }),
        this.database.votebanNoBanVoter.deleteMany({ where: { authorId: editorId, votebanId: id } }),
      ]);
    }
    if (action === VotebanAction.NO_BAN) {
      await this.database.$transaction([
        this.database.votebanNoBanVoter.create({
          data: { authorId: editorId, editorId, votebanId: id },
          select: { id: true },
        }),
        this.database.votebanBanVoter.deleteMany({ where: { authorId: editorId, votebanId: id } }),
      ]);
    }
    // An expected error may happen when bot was removed from the chat or there are no enough permissions
    await Promise.all([ctx.answerCbQuery(t("voteban:voteCounted")), this.updateResults(ctx).catch(() => undefined)]);
  }

  /**
   * Provides the ability to vote for ban. The command to start voting must be strict,
   * but case-insensitive: "/voteban" or "voteban".
   * @param ctx Text message context
   */
  private async votebanCommand(ctx: TextMessageCtx): Promise<void> {
    const { from, message_id: messageId, sender_chat: fromSenderChat, reply_to_message: replyToMessage } = ctx.message;
    const candidate = replyToMessage?.from;
    const candidateSenderChat = replyToMessage?.sender_chat;

    const [chat, isCandidateAdmin] = await Promise.all([
      this.database.upsertChat(ctx.chat, from),
      typeof candidate?.id === "number" && !candidateSenderChat
        ? // Check seperately, because other bots are not included in admin list.
          isChatAdmin(ctx.telegram, ctx.chat.id, candidate.id)
        : candidateSenderChat?.id === ctx.chat.id,
    ]);
    await changeLanguage(chat.language);

    if (chat.type === ChatType.PRIVATE) {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return; // Private chat, return.
    }
    if (!chat.votebanLimit) {
      return; // The feature is disabled, return.
    }
    if (!this.database.isChatAdmin(chat, ctx.botInfo.id)) {
      await ctx.reply(t("common:needAdminPermissions"), { reply_to_message_id: messageId });
      return; // Bot is not an admin, return.
    }
    if (!candidate) {
      await ctx.reply(t("voteban:replyToSomeonesMessage"), { reply_to_message_id: messageId });
      return; // No candidate, return.
    }
    if (candidate.id === ctx.botInfo.id) {
      await ctx.reply(t("voteban:cannotVoteAgainstMyself"), { reply_to_message_id: messageId });
      return; // Candidate is the bot itself, return.
    }
    if (isCandidateAdmin) {
      await ctx.reply(t("voteban:cannotVoteAgainstAdmin"), { reply_to_message_id: messageId });
      return; // Candidate is an admin, return.
    }

    const authorLink = getUserOrChatHtmlLink(from, fromSenderChat);
    const candidateLink = getUserOrChatHtmlLink(candidate, candidateSenderChat);
    // Do not accept vote from sender chat
    const banVotesCount = fromSenderChat ? 0 : 1;
    const banButtonText = t("voteban:banWithCounter", { LIMIT: chat.votebanLimit, VOTES: banVotesCount });
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
        reply_to_message_id: replyToMessage.message_id,
      }),
      candidateSenderChat && this.database.upsertSenderChat(candidateSenderChat, from),
      fromSenderChat && this.database.upsertSenderChat(fromSenderChat, from),
    ]);

    await this.database.$transaction([
      this.database.upsertUser(candidate, from),
      this.database.voteban.create({
        data: {
          authorId: from.id,
          authorSenderChatId: fromSenderChat?.id,
          // Do not accept vote from sender chat
          banVoters: fromSenderChat ? undefined : { create: { authorId: from.id, editorId: from.id } },
          candidateId: candidate.id,
          candidateSenderChatId: candidateSenderChat?.id,
          chatId: chat.id,
          editorId: from.id,
          mediaGroupId: "media_group_id" in replyToMessage ? replyToMessage.media_group_id : undefined,
          messageId: reply.message_id,
        },
        select: { id: true },
      }),
    ]);
  }
}
