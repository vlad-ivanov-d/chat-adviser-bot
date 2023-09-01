import { User } from "@prisma/client";
import { CronJob } from "cron";
import { settings, SettingsActions } from "features/settings";
import { t, TOptions } from "i18next";
import { Chat, Message, User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { CallbackCtx, MessageCtx } from "types/context";
import { MAX_INT } from "utils/consts";
import {
  isChatAdmin as isPrismaChatAdmin,
  joinModifiedInfo,
  prisma,
  upsertChat,
  upsertChatSettingsHistory,
  upsertUser,
} from "utils/prisma";
import { getUserHtmlLink, isChatAdmin, isChatMember, isCleanCommand } from "utils/telegraf";

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

    const { from, message_id: messageId, reply_to_message: replyToMessageId } = ctx.message;
    const candidate = replyToMessageId?.from;
    const [chat, isCandidateAdmin] = await Promise.all([
      upsertChat(ctx.chat.id, from),
      // Check it seperately, because other admin bots are not included in the chat admin list.
      typeof candidate?.id === "number" ? isChatAdmin(ctx.chat.id, candidate.id) : undefined,
    ]);
    const { language: lng, votebanLimit } = chat;

    if (ctx.chat.type === "private") {
      await ctx.reply(t("common:commandNotForPrivateChats", { lng }));
      return; // Private chat, return.
    }
    if (!votebanLimit) {
      await ctx.reply(t("common:featureDisabled", { lng }), { reply_to_message_id: messageId });
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

    const authorLink = getUserHtmlLink(from, ctx.chat);
    const candidateLink = getUserHtmlLink(candidate, ctx.chat);
    const reply = await ctx.reply(t("voteban:question", { AUTHOR: authorLink, CANDIDATE: candidateLink, lng }), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              callback_data: VotebanAction.Ban,
              text: t("voteban:banWithCounter", { LIMIT: votebanLimit, VOTES: 1, lng }),
            },
          ],
          [
            {
              callback_data: VotebanAction.NoBan,
              text: t("voteban:noBanWithCounter", { LIMIT: votebanLimit, VOTES: 0, lng }),
            },
          ],
        ],
      },
      reply_to_message_id: replyToMessageId?.message_id,
    });
    await prisma.$transaction([
      upsertUser(candidate, from),
      prisma.voteban.create({
        data: {
          authorId: from.id,
          banVoters: { create: { authorId: from.id, editorId: from.id } },
          candidateId: candidate.id,
          chatId: ctx.chat.id,
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

    const [{ language: lng }, upsertedChat] = await Promise.all([
      upsertChat(ctx.chat, ctx.callbackQuery.from),
      upsertChat(chatId, ctx.callbackQuery.from),
    ]);

    const isAdmin = await settings.validateAdminPermissions(ctx, upsertedChat, lng);
    if (!isAdmin) {
      return; // User is not an admin anymore, redirect to chat list.
    }

    const { title, votebanLimit } = upsertedChat;
    const newValue = this.sanitizeValue(typeof value === "undefined" || isNaN(value) ? votebanLimit : value);
    const msg = t("voteban:setLimit", { CHAT_TITLE: title, count: newValue, lng });
    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, settingName: "votebanLimit", upsertedChat }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { callback_data: `${SettingsActions.Voteban}?chatId=${chatId}&v=${newValue - 1}`, text: "-1" },
              {
                // Value can't be equal to 1
                callback_data: `${SettingsActions.Voteban}?chatId=${chatId}&v=${Math.max(2, newValue + 1)}`,
                text: "+1",
              },
            ],
            [
              { callback_data: `${SettingsActions.Voteban}?chatId=${chatId}&v=${newValue - 50}`, text: "-50" },
              { callback_data: `${SettingsActions.Voteban}?chatId=${chatId}&v=${newValue + 50}`, text: "+50" },
            ],
            [
              {
                callback_data: `${SettingsActions.VotebanSave}?chatId=${chatId}&v=${newValue}`,
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

    const { from } = ctx.callbackQuery;
    const [{ language: lng }, upsertedChat] = await Promise.all([upsertChat(ctx.chat, from), upsertChat(chatId, from)]);

    const isAdmin = await settings.validateAdminPermissions(ctx, upsertedChat, lng);
    if (!isAdmin) {
      return; // User is not an admin anymore, redirect to chat list.
    }

    const votebanLimit = this.sanitizeValue(value) || null;
    await prisma.$transaction([
      prisma.chat.update({ data: { votebanLimit }, select: { id: true }, where: { id: chatId } }),
      upsertChatSettingsHistory(chatId, from.id, "votebanLimit"),
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

    const [chat, isUserChatMember, results] = await Promise.all([
      upsertChat(message.chat, from),
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

    const { editorId, language: lng } = chat;
    if (!results) {
      await ctx.answerCbQuery(t("voteban:expired", { lng }), { show_alert: true });
      return; // Results not found. Looks like voting has expired and has been deleted, return.
    }
    const { banVoters, id, noBanVoters } = results;
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
    if (!isUserChatMember) {
      await ctx.answerCbQuery(t("voteban:mustBeChatMember", { lng }), { show_alert: true });
      return; // User is not a chat member, return.
    }

    if (action === VotebanAction.Ban) {
      await prisma.$transaction([
        prisma.votebanBanVoter.create({
          data: { authorId: editorId, editorId, votebanId: id },
          select: { id: true },
        }),
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
   * @param chat Chat. It's important to handle Telegram anonymous admins and show chat title instead of admin.
   * @param params User link parameters
   * @param params.lng Language code
   * @param params.maxLength Max length of the result. Includes separators, but excludes the text which is
   * at the trimmed ending.
   * @returns User links
   */
  private getUserLinks(users: (User | TelegramUser)[], chat: Chat, params: { lng: string; maxLength: number }): string {
    let result = "";
    for (const user of users) {
      const link = getUserHtmlLink(user, chat);
      if (!result) {
        result += link;
        continue;
      }
      if (`${result}, ${link}`.length <= params.maxLength) {
        result += `, ${link}`;
        continue;
      }
      return t("voteban:trimmedUsers", { USERS: result, lng: params.lng });
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

    const [chat, results] = await Promise.all([
      upsertChat(message.chat, from),
      prisma.voteban.findUnique({
        select: {
          author: true,
          banVoters: { select: { author: true } },
          candidate: true,
          noBanVoters: { select: { author: true } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);
    if (!results) {
      return; // Something went wrong with database
    }

    const { author, banVoters, candidate, noBanVoters } = results;
    const { language: lng, votebanLimit } = chat;
    const authorLink = getUserHtmlLink(author, message.chat);
    const candidateLink = getUserHtmlLink(candidate, message.chat);
    const isBan = banVoters.length > noBanVoters.length;
    const voteUsers = (isBan ? banVoters : noBanVoters).map((v) => v.author);
    const voteUserLinks = this.getUserLinks(voteUsers, message.chat, { lng, maxLength: 2500 });
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
    if (banVoters.length >= votebanLimit || noBanVoters.length >= votebanLimit) {
      const deletedMessageId = (message as Message.TextMessage).reply_to_message?.message_id;
      const resultsMsg = isBan ? t("voteban:banResults", lngOptions) : t("voteban:noBanResults", lngOptions);
      await Promise.all([
        prisma.voteban.update({
          data: { completed: true },
          select: { id: true },
          where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
        }),
        ctx.editMessageText([questionMsg, resultsMsg].join("\n\n"), { parse_mode: "HTML" }),
        ctx.reply(t("voteban:completed", { lng }), { reply_to_message_id: message.message_id }),
        // An expected error may happen if bot has no enough permissions
        typeof deletedMessageId === "number" && isBan && ctx.deleteMessage(deletedMessageId).catch(() => undefined),
        // An expected error may happen if bot has no enough permissions
        isBan && ctx.banChatMember(candidate.id).catch(() => undefined),
      ]);
      return; // Voting completed, return.
    }

    await ctx.editMessageText(questionMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              callback_data: "voteban-ban",
              text: t("voteban:banWithCounter", { LIMIT: votebanLimit, VOTES: banVoters.length, lng }),
            },
          ],
          [
            {
              callback_data: "voteban-no-ban",
              text: t("voteban:noBanWithCounter", { LIMIT: votebanLimit, VOTES: noBanVoters.length, lng }),
            },
          ],
        ],
      },
    });
  }
}

export const voteban = new Voteban();
