import { AddingBotsRule, ChatSettingName } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Database } from "modules/database";
import { Settings } from "modules/settings";
import { Telegraf } from "telegraf";
import { callbackQuery, message } from "telegraf/filters";
import { CallbackCtx, NewChatMembersCtx } from "types/telegrafContext";
import { getCallbackQueryParams, getChatHtmlLink, getUserHtmlLink, kickChatMember } from "utils/telegraf";

import { AddingBotsAction } from "./addingBots.types";

export class AddingBots {
  /**
   * Creates adding bots module
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
   * Initiates adding bots module
   */
  public init(): void {
    this.bot.on(callbackQuery("data"), async (ctx, next) => {
      const { action, chatId, value } = getCallbackQueryParams(ctx);
      switch (action) {
        case AddingBotsAction.SAVE:
          await this.saveSettings(ctx, chatId, value);
          break;
        case AddingBotsAction.SETTINGS:
          await this.renderSettings(ctx, chatId);
          break;
        default:
          await next();
      }
    });
    this.bot.on(message("new_chat_members"), (ctx, next) => this.validateNewChatMembers(ctx, next));
  }

  /**
   * Gets available adding bots options
   * @returns Adding bots options
   */
  private getOptions(): { id: AddingBotsRule | null; title: string }[] {
    return [
      { id: AddingBotsRule.RESTRICT, title: t("addingBots:restricted") },
      { id: AddingBotsRule.BAN, title: t("addingBots:restrictedAndBan") },
      { id: null, title: t("addingBots:allowed") },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  private async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render adding bots settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await this.settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const allowedCbData = `${AddingBotsAction.SAVE}?chatId=${chatId}`;
    const banCbData = `${AddingBotsAction.SAVE}?chatId=${chatId}&v=${AddingBotsRule.BAN}`;
    const restrictCbData = `${AddingBotsAction.SAVE}?chatId=${chatId}&v=${AddingBotsRule.RESTRICT}`;
    const chatLink = getChatHtmlLink(prismaChat);
    const sanitizedValue = this.sanitizeValue(prismaChat.addingBots);
    const value = this.getOptions().find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("addingBots:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(this.database.joinModifiedInfo(msg, ChatSettingName.ADDING_BOTS, prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: restrictCbData, text: t("addingBots:restrict") }],
            [{ callback_data: banCbData, text: t("addingBots:restrictAndBan") }],
            [{ callback_data: allowedCbData, text: t("addingBots:allow") }],
            this.settings.getBackToFeaturesButton(chatId),
          ],
        },
      }),
    ]).catch(() => undefined); // An expected error may happen if the message won't change during edit
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Restrict bots state
   */
  private async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save adding bots settings.");
    }

    const { language } = await this.database.upsertChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await this.settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBots = this.sanitizeValue(value);

    await this.database.$transaction([
      this.database.chat.update({ data: { addingBots }, select: { id: true }, where: { id: chatId } }),
      this.database.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.ADDING_BOTS),
    ]);
    await Promise.all([this.settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Sanitizes adding bots rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): AddingBotsRule | null {
    switch (value) {
      case AddingBotsRule.BAN:
      case AddingBotsRule.RESTRICT:
        return value;
      default:
        return null;
    }
  }

  /**
   * Validates new chat members
   * @param ctx New chat members context
   * @param next Function to continue processing
   */
  private async validateNewChatMembers(ctx: NewChatMembersCtx, next: () => Promise<void>): Promise<void> {
    const { chat, from, new_chat_members: newChatMembers, sender_chat: senderChat } = ctx.update.message;
    const newBots = newChatMembers.filter((m) => m.is_bot && m.id !== ctx.botInfo.id);
    if (newBots.length === 0) {
      await next();
      return; // No bots were added, return.
    }

    const prismaChat = await this.database.upsertChat(chat, from);
    await changeLanguage(prismaChat.language);

    if (
      this.database.isChatAdmin(prismaChat, from.id, senderChat?.id) || // Current user is an admin
      !this.database.isChatAdmin(prismaChat, ctx.botInfo.id) // Bot is not an admin
    ) {
      await next();
      return;
    }

    try {
      if (prismaChat.addingBots === AddingBotsRule.RESTRICT) {
        await Promise.all(newBots.map(async ({ id }) => kickChatMember(this.bot, chat.id, id)));
      }
      if (prismaChat.addingBots === AddingBotsRule.BAN && senderChat) {
        const msg = t("addingBots:userBanned", { USER: getChatHtmlLink(senderChat) });
        await ctx.banChatSenderChat(senderChat.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
      if (prismaChat.addingBots === AddingBotsRule.BAN && !senderChat) {
        const msg = t("addingBots:userBanned", { USER: getUserHtmlLink(from) });
        await ctx.banChatMember(from.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
    } catch {
      // An expected error may happen when bot has no enough permissions
    }

    await next();
  }
}
