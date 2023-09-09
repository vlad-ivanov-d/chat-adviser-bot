import { User } from "@prisma/client";
import { CronJob } from "cron";
import { language } from "features/language";
import { settings, SettingsAction } from "features/settings";
import { t, TOptions } from "i18next";
import { User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { CallbackCtx, MessageCtx } from "types/context";
import { MAX_INT } from "utils/consts";
import {
  isPrismaChatAdmin,
  isPrismaChatExists,
  joinModifiedInfo,
  prisma,
  upsertPrismaChat,
  upsertPrismaChatSettingsHistory,
  upsertPrismaSenderChat,
  upsertPrismaUser,
} from "utils/prisma";
import { getChatHtmlLink, getUserHtmlLink, isChatAdmin, isChatMember, isCleanCommand } from "utils/telegraf";

export enum VotebanAction {
  Ban = "voteban-ban",
  NoBan = "voteban-no-ban",
}

export class Voteban {
  /**
   * Provides the ability to vote for ban. Message should be strict.
   * @param ctx Message context
   * @param cleanCommand Clean command name
   */
  public async command(ctx: MessageCtx, cleanCommand: string): Promise<void> {
    if (!isCleanCommand(cleanCommand, ctx.message.text)) {
      return; // Not clean command, ignore.
    }

    const { from, message_id: messageId, sender_chat: fromSenderChat } = ctx.message;
    const candidate = ctx.message.reply_to_message?.from;
    const candidateSenderChat = ctx.message.reply_to_message?.sender_chat;

    const [chat, isCandidateAdmin] = await Promise.all([
      upsertPrismaChat(ctx.chat, from),
      typeof candidate?.id === "number" && !candidateSenderChat
        ? isChatAdmin(ctx.chat.id, candidate.id) // Check seperately, because other bots are not included in admin list.
        : candidateSenderChat?.id === ctx.chat.id,
    ]);

    const { language: lng, votebanLimit } = chat;
    if (chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats", { lng }));
      return; // Private chat, return.
    }
    if (!votebanLimit) {
      return; // The feature is disabled, return.
    }
    if (!isPrismaChatAdmin(chat, ctx.botInfo.id)) {
      await ctx.reply(t("common:needAdminPermissions", { lng }), { reply_to_message_id: messageId });
      return; // Bot is not an admin, return.
    }
    if (!candidate) {
      await ctx.reply(t("voteban:replyToSomeonesMessage", { lng }), { reply_to_message_id: messageId });
      return; // No candidate, return.
    }
    if (candidate.id === ctx.botInfo.id) {
      await ctx.reply(t("voteban:cannotVoteAgainstMyself", { lng }), { reply_to_message_id: messageId });
      return; // Candidate is the bot itself, return.
    }
    if (isCandidateAdmin) {
      await ctx.reply(t("voteban:cannotVoteAgainstAdmin", { lng }), { reply_to_message_id: messageId });
      return; // Candidate is an admin, return.
    }

    const authorLink = fromSenderChat ? getChatHtmlLink(fromSenderChat) : getUserHtmlLink(from);
    const candidateLink = candidateSenderChat ? getChatHtmlLink(candidateSenderChat) : getUserHtmlLink(candidate);
    // Do not accept vote from sender chat
    const banVotesCount = fromSenderChat ? 0 : 1;
    const banButtonText = t("voteban:banWithCounter", { LIMIT: votebanLimit, VOTES: banVotesCount, lng });
    const noBanButtonText = t("voteban:noBanWithCounter", { LIMIT: votebanLimit, VOTES: 0, lng });

    const [reply] = await Promise.all([
      ctx.reply(t("voteban:question", { AUTHOR: authorLink, CANDIDATE: candidateLink, lng }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: VotebanAction.Ban, text: banButtonText }],
            [{ callback_data: VotebanAction.NoBan, text: noBanButtonText }],
          ],
        },
        reply_to_message_id: ctx.message.reply_to_message?.message_id,
      }),
      candidateSenderChat && upsertPrismaSenderChat(candidateSenderChat, from),
      fromSenderChat && upsertPrismaSenderChat(fromSenderChat, from),
    ]);

    await prisma.$transaction([
      upsertPrismaUser(candidate, from),
      prisma.voteban.create({
        data: {
          authorId: from.id,
          authorSenderChatId: fromSenderChat?.id,
          // Do not accept vote from sender chat
          banVoters: fromSenderChat ? undefined : { create: { authorId: from.id, editorId: from.id } },
          candidateId: candidate.id,
          candidateSenderChatId: candidateSenderChat?.id,
          chatId: chat.id,
          editorId: from.id,
          messageId: reply.message_id,
        },
        select: { id: true },
      }),
    ]);
  }

  /**
   * Removes old votings from database
   * @returns Cron job
   */
  public cronJob(): CronJob {
    return new CronJob({
      cronTime: "0 0 0 * * *", // Every day at 00:00:00
      /**
       * The function to fire at the specified time.
       */
      onTick: () => {
        void (async () => {
          const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
          await prisma.voteban.deleteMany({ where: { createdAt: { lt: date } } });
        })();
      },
      start: true,
    });
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Voteban limit value
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number, value?: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const { displayTitle, votebanLimit } = prismaChat;
    const newValue = this.sanitizeValue(typeof value === "undefined" || isNaN(value) ? votebanLimit : value);
    const msg = t("voteban:setLimit", { CHAT_TITLE: displayTitle, count: newValue, lng });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, prismaChat, settingName: "votebanLimit" }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { callback_data: `${SettingsAction.Voteban}?chatId=${chatId}&v=${newValue - 1}`, text: "-1" },
              {
                // Value can't be equal to 1
                callback_data: `${SettingsAction.Voteban}?chatId=${chatId}&v=${Math.max(2, newValue + 1)}`,
                text: "+1",
              },
            ],
            [
              { callback_data: `${SettingsAction.Voteban}?chatId=${chatId}&v=${newValue - 50}`, text: "-50" },
              { callback_data: `${SettingsAction.Voteban}?chatId=${chatId}&v=${newValue + 50}`, text: "+50" },
            ],
            [
              {
                callback_data: `${SettingsAction.VotebanSave}?chatId=${chatId}&v=${newValue}`,
                text: t("settings:save", { lng }),
              },
            ],
            settings.getBackToFeaturesButton(chatId, lng),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Voteban limit value
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const votebanLimit = this.sanitizeValue(value) || null;
    await prisma.$transaction([
      prisma.chat.update({ data: { votebanLimit }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "votebanLimit"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx, lng), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Saves the user's choice
   * @param ctx Callback context
   * @param action User action
   */
  public async vote(ctx: CallbackCtx, action: VotebanAction): Promise<void> {
    const { from, message } = ctx.update.callback_query;
    if (!message) {
      return; // No message, something went wrong.
    }

    const [isChatExists, isVoterChatMember, voting] = await Promise.all([
      isPrismaChatExists(message.chat.id),
      isChatMember(message.chat.id, from.id),
      prisma.voteban.findUnique({
        select: {
          banVoters: { select: { authorId: true }, where: { authorId: from.id } },
          id: true,
          noBanVoters: { select: { authorId: true }, where: { authorId: from.id } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);

    // Do not upsert chat if it's not found. It means that bot was removed from the chat.
    const chat = isChatExists ? await upsertPrismaChat(message.chat, from) : undefined;
    const lng = chat?.language ?? language.sanitizeValue(from.language_code);
    if (!chat || !voting) {
      await ctx.answerCbQuery(t("voteban:expired", { lng }), { show_alert: true });
      return; // Voting not found. It has been deleted.
    }

    const { banVoters, id, noBanVoters } = voting;
    const { editorId } = chat;
    if ((action === VotebanAction.Ban ? banVoters : noBanVoters).map((v) => v.authorId).includes(from.id)) {
      await ctx.answerCbQuery(t("voteban:alreadyVoted", { lng }), { show_alert: true });
      return; // User has already voted, return.
    }
    if (!isPrismaChatAdmin(chat, ctx.botInfo.id)) {
      const msg = t("common:needAdminPermissions", { lng });
      // An expected error may happen when bot was removed from the chat or there are no enough permissions
      await Promise.all([ctx.answerCbQuery(msg, { show_alert: true }), this.updateResults(ctx).catch(() => undefined)]);
      return; // Bot is not an admin, return.
    }
    if (!isVoterChatMember) {
      await ctx.answerCbQuery(t("voteban:mustBeChatMember", { lng }), { show_alert: true });
      return; // Voter is not a chat member, return.
    }
    if (action === VotebanAction.Ban) {
      await prisma.$transaction([
        prisma.votebanBanVoter.create({ data: { authorId: editorId, editorId, votebanId: id }, select: { id: true } }),
        prisma.votebanNoBanVoter.deleteMany({ where: { authorId: editorId, votebanId: id } }),
      ]);
    }
    if (action === VotebanAction.NoBan) {
      await prisma.$transaction([
        prisma.votebanNoBanVoter.create({
          data: { authorId: editorId, editorId, votebanId: id },
          select: { id: true },
        }),
        prisma.votebanBanVoter.deleteMany({ where: { authorId: editorId, votebanId: id } }),
      ]);
    }
    await Promise.all([
      ctx.answerCbQuery(t("voteban:voteCounted", { lng })),
      // An expected error may happen when bot was removed from the chat or there are no enough permissions
      this.updateResults(ctx).catch(() => undefined),
    ]);
  }

  /**
   * Gets user links as HTML
   * @param users Users
   * @param lng Language code
   * @returns User links
   */
  private getUserLinks(users: (User | TelegramUser)[], lng: string): string {
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
      return t("voteban:trimmedUsers", { USERS: result, lng });
    }
    return result;
  }

  /**
   * Sanitizes voteban limit value
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: number | null): number {
    if (value === null || isNaN(value) || value === 1) {
      return 0;
    }
    return Math.max(0, Math.min(MAX_INT, value));
  }

  /**
   * Update voting results
   * @param ctx Callback context
   */
  private async updateResults(ctx: CallbackCtx): Promise<void> {
    const { from, message } = ctx.update.callback_query;
    if (!message) {
      return; // No message, something went wrong.
    }

    const [chat, voting] = await Promise.all([
      upsertPrismaChat(message.chat, from),
      prisma.voteban.findUniqueOrThrow({
        select: {
          author: true,
          authorSenderChat: true,
          banVoters: { select: { author: true } },
          candidate: true,
          candidateSenderChat: true,
          noBanVoters: { select: { author: true } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);

    const { author, authorSenderChat, banVoters, candidate, candidateSenderChat, noBanVoters } = voting;
    const { language: lng, votebanLimit } = chat;
    const authorLink = authorSenderChat ? getChatHtmlLink(authorSenderChat) : getUserHtmlLink(author);
    const candidateLink = candidateSenderChat ? getChatHtmlLink(candidateSenderChat) : getUserHtmlLink(candidate);
    const isBan = banVoters.length > noBanVoters.length;
    const voteUsers = (isBan ? banVoters : noBanVoters).map((v) => v.author);
    const voteUserLinks = this.getUserLinks(voteUsers, lng);
    const lngOptions: TOptions = { AUTHOR: authorLink, CANDIDATE: candidateLink, USERS: voteUserLinks, lng };
    const questionMsg = t("voteban:question", lngOptions);

    if (!votebanLimit) {
      const cancelledMsg = t("voteban:cancelledFeatureDisabled", { lng });
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // The feature is disabled, return.
    }
    if (!isPrismaChatAdmin(chat, ctx.botInfo.id)) {
      const cancelledMsg = t("voteban:cancelledBotNotAdmin", { lng });
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // Bot is not an admin, return.
    }
    // Check it seperately, because other admin bots are not included in the chat admin list.
    const isCandidateAdmin = await isChatAdmin(message.chat.id, candidate.id);
    if (isCandidateAdmin) {
      const cancelledMsg = t("voteban:cancelledVotingAgainstAdmin", { lng });
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // Candidate is an admin, return.
    }
    if (voteUsers.length >= votebanLimit) {
      const candidateMessageId = "reply_to_message" in message ? message.reply_to_message?.message_id : undefined;
      const resultsMsg = isBan ? t("voteban:banResults", lngOptions) : t("voteban:noBanResults", lngOptions);
      await Promise.all([
        prisma.voteban.update({
          data: { completed: true },
          select: { id: true },
          where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
        }),
        ctx.editMessageText([questionMsg, resultsMsg].join("\n\n"), { parse_mode: "HTML" }),
        ctx.reply(t("voteban:completed", { lng }), { reply_to_message_id: message.message_id }),
        // An expected errors may happen if bot has no enough permissions, so catch below requests.
        isBan && typeof candidateMessageId === "number" && ctx.deleteMessage(candidateMessageId).catch(() => undefined),
        isBan && candidateSenderChat && ctx.banChatSenderChat(candidateSenderChat.id).catch(() => undefined),
        isBan && !candidateSenderChat && ctx.banChatMember(candidate.id).catch(() => undefined),
      ]);
      return; // Voting completed, return.
    }

    const banButtonText = t("voteban:banWithCounter", { LIMIT: votebanLimit, VOTES: banVoters.length, lng });
    const noBanButtonText = t("voteban:noBanWithCounter", { LIMIT: votebanLimit, VOTES: noBanVoters.length, lng });
    await ctx.editMessageText(questionMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ callback_data: "voteban-ban", text: banButtonText }],
          [{ callback_data: "voteban-no-ban", text: noBanButtonText }],
        ],
      },
    });
  }
}

export const voteban = new Voteban();
