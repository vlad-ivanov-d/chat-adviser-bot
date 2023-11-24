import { ChatSettingName, ChatType, User } from "@prisma/client";
import { language } from "features/language";
import { settings, SettingsAction } from "features/settings";
import { changeLanguage, t, TOptions } from "i18next";
import { User as TelegramUser } from "telegraf/typings/core/types/typegram";
import { CallbackCtx, TextMessageCtx } from "types/context";
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
import {
  getChatHtmlLink,
  getUserHtmlLink,
  getUserOrChatHtmlLink,
  isChatAdmin,
  isChatMember,
  isCleanCommand,
} from "utils/telegraf";

import { VotebanAction } from "./voteban.types";

export class Voteban {
  /**
   * Provides the ability to vote for ban. Message should be strict.
   * @param ctx Text message context
   * @param cleanCommand Clean command name
   */
  public async command(ctx: TextMessageCtx, cleanCommand: string): Promise<void> {
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
    await changeLanguage(chat.language);

    if (chat.type === ChatType.PRIVATE) {
      await ctx.reply(t("common:commandNotForPrivateChats"));
      return; // Private chat, return.
    }
    if (!chat.votebanLimit) {
      return; // The feature is disabled, return.
    }
    if (!isPrismaChatAdmin(chat, ctx.botInfo.id)) {
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
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Voteban limit value
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number, value?: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render voteban settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const chatLink = getChatHtmlLink(prismaChat);
    const { votebanLimit } = prismaChat;
    const newValue = this.sanitizeValue(typeof value === "undefined" || isNaN(value) ? votebanLimit : value);
    const msg = t("voteban:setLimit", { CHAT: chatLink, count: newValue });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, ChatSettingName.VOTEBAN_LIMIT, prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { callback_data: `${SettingsAction.VOTEBAN}?chatId=${chatId}&v=${newValue - 1}`, text: "-1" },
              {
                // Value can't be equal to 1
                callback_data: `${SettingsAction.VOTEBAN}?chatId=${chatId}&v=${Math.max(2, newValue + 1)}`,
                text: "+1",
              },
            ],
            [
              { callback_data: `${SettingsAction.VOTEBAN}?chatId=${chatId}&v=${newValue - 50}`, text: "-50" },
              { callback_data: `${SettingsAction.VOTEBAN}?chatId=${chatId}&v=${newValue + 50}`, text: "+50" },
            ],
            [
              {
                callback_data: `${SettingsAction.VOTEBAN_SAVE}?chatId=${chatId}&v=${newValue}`,
                text: t("settings:save"),
              },
            ],
            settings.getBackToFeaturesButton(chatId),
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
      throw new Error("Chat is not defined to save voteban settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const votebanLimit = this.sanitizeValue(value) || null;
    await prisma.$transaction([
      prisma.chat.update({ data: { votebanLimit }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.VOTEBAN_LIMIT),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Saves the user's choice
   * @param ctx Callback context
   * @param action User action
   */
  public async vote(ctx: CallbackCtx, action: VotebanAction): Promise<void> {
    const { from, message } = ctx.update.callback_query;
    if (!message) {
      throw new Error("Message is not defined to save the vote for voteban.");
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
    if (!isPrismaChatAdmin(chat, ctx.botInfo.id)) {
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
      await prisma.$transaction([
        prisma.votebanBanVoter.create({ data: { authorId: editorId, editorId, votebanId: id }, select: { id: true } }),
        prisma.votebanNoBanVoter.deleteMany({ where: { authorId: editorId, votebanId: id } }),
      ]);
    }
    if (action === VotebanAction.NO_BAN) {
      await prisma.$transaction([
        prisma.votebanNoBanVoter.create({
          data: { authorId: editorId, editorId, votebanId: id },
          select: { id: true },
        }),
        prisma.votebanBanVoter.deleteMany({ where: { authorId: editorId, votebanId: id } }),
      ]);
    }
    // An expected error may happen when bot was removed from the chat or there are no enough permissions
    await Promise.all([ctx.answerCbQuery(t("voteban:voteCounted")), this.updateResults(ctx).catch(() => undefined)]);
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
   * Sanitizes voteban limit value
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: number | null): number {
    return value === null || isNaN(value) || value === 1 ? 0 : Math.max(0, Math.min(MAX_INT, value));
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
      upsertPrismaChat(message.chat, from),
      prisma.voteban.findUniqueOrThrow({
        select: {
          author: true,
          authorSenderChat: true,
          banVoters: { orderBy: { createdAt: "asc" }, select: { author: true } },
          candidate: true,
          candidateSenderChat: true,
          noBanVoters: { orderBy: { createdAt: "asc" }, select: { author: true } },
        },
        where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
      }),
    ]);
    await changeLanguage(chat.language);

    const { author, authorSenderChat, banVoters, candidate, candidateSenderChat, noBanVoters } = voting;
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
    if (!isPrismaChatAdmin(chat, ctx.botInfo.id)) {
      const cancelledMsg = t("voteban:cancelledBotNotAdmin");
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // Bot is not an admin, return.
    }
    // Check it seperately, because other admin bots are not included in the chat admin list.
    const isCandidateAdmin = await isChatAdmin(message.chat.id, candidate.id);
    if (isCandidateAdmin) {
      const cancelledMsg = t("voteban:cancelledVotingAgainstAdmin");
      await ctx.editMessageText([questionMsg, cancelledMsg].join("\n\n"), { parse_mode: "HTML" });
      return; // Candidate is an admin, return.
    }
    if (voteUsers.length >= chat.votebanLimit) {
      const candidateMessageId = "reply_to_message" in message ? message.reply_to_message?.message_id : undefined;
      const resultsMsg = isBan ? t("voteban:banResults", tOptions) : t("voteban:noBanResults", tOptions);
      await Promise.all([
        prisma.voteban.update({
          data: { isCompleted: true },
          select: { id: true },
          where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
        }),
        ctx.editMessageText([questionMsg, resultsMsg].join("\n\n"), { parse_mode: "HTML" }),
        ctx.reply(t("voteban:completed"), { reply_to_message_id: message.message_id }),
        // An expected error may happen if there are no enough permissions
        isBan && typeof candidateMessageId === "number" && ctx.deleteMessage(candidateMessageId).catch(() => undefined),
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
}

export const voteban = new Voteban();
