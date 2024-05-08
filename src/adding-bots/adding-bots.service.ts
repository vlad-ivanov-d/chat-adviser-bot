import { Injectable, Logger } from "@nestjs/common";
import { AddingBotsRule, ChatSettingName } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { Ctx, InjectBot, Next, On, Update } from "nestjs-telegraf";
import { Telegraf } from "telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { NextFunction } from "src/types/next-function";
import { CallbackCtx, NewChatMembersCtx } from "src/types/telegraf-context";
import { buildCbData, getChatHtmlLink, getUserHtmlLink, parseCbData } from "src/utils/telegraf";

import { AddingBotsAction } from "./interfaces/action.interface";

@Update()
@Injectable()
export class AddingBotsService {
  private readonly logger = new Logger(AddingBotsService.name);

  /**
   * Creates service
   * @param bot Telegram bot instance
   * @param prismaService Database service
   * @param settingsService Settings service
   */
  public constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly prismaService: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Handles callback query related to adding bots
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("callback_query")
  public async callbackQuery(ctx: CallbackCtx, next: NextFunction): Promise<void> {
    const { action, chatId, value } = parseCbData(ctx);
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
  }

  /**
   * Validates new chat members
   * @param ctx New chat members context
   * @param next Function to continue processing
   */
  @On("new_chat_members")
  public async validateNewChatMembers(@Ctx() ctx: NewChatMembersCtx, @Next() next: NextFunction): Promise<void> {
    const { chat, from, new_chat_members: newChatMembers, sender_chat: senderChat } = ctx.update.message;
    const newBots = newChatMembers.filter((m) => m.is_bot && m.id !== ctx.botInfo.id);
    if (newBots.length === 0) {
      await next();
      return; // No bots were added, return.
    }

    const dbChat = await this.prismaService.upsertChatWithCache(chat, from);
    await changeLanguage(dbChat.language);

    if (
      this.prismaService.isChatAdmin(dbChat, from.id, senderChat?.id) || // Current user is an admin
      !this.prismaService.isChatAdmin(dbChat, ctx.botInfo.id) // Bot is not an admin
    ) {
      await next();
      return;
    }

    try {
      if (dbChat.addingBots === AddingBotsRule.BAN || dbChat.addingBots === AddingBotsRule.RESTRICT) {
        await Promise.all(
          newBots.map(async ({ id }) => {
            await ctx.banChatMember(id);
            await ctx.unbanChatMember(id);
          }),
        );
      }
      if (dbChat.addingBots === AddingBotsRule.BAN && senderChat) {
        const msg = t("addingBots:userBanned", { USER: getChatHtmlLink(senderChat) });
        await ctx.banChatSenderChat(senderChat.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
      if (dbChat.addingBots === AddingBotsRule.BAN && !senderChat) {
        const msg = t("addingBots:userBanned", { USER: getUserHtmlLink(from) });
        await ctx.banChatMember(from.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
    } catch {
      // An expected error may happen when bot has no enough permissions
    }

    newBots.forEach(() => {
      this.logger.log("A bot was removed from the chat");
    });

    await next();
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

    const { language, timeZone } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const chat = await this.settingsService.resolveChat(ctx, chatId);
    if (!chat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const allowedCbData = buildCbData({ action: AddingBotsAction.SAVE, chatId });
    const banCbData = buildCbData({ action: AddingBotsAction.SAVE, chatId, value: AddingBotsRule.BAN });
    const restrictCbData = buildCbData({ action: AddingBotsAction.SAVE, chatId, value: AddingBotsRule.RESTRICT });
    const chatLink = getChatHtmlLink(chat);
    const sanitizedValue = this.sanitizeValue(chat.addingBots);
    const value = this.getOptions().find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("addingBots:set", { CHAT: chatLink, VALUE: value });
    const msgWithModifiedInfo = this.settingsService.withModifiedInfo(msg, {
      chat,
      settingName: ChatSettingName.ADDING_BOTS,
      timeZone,
    });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(msgWithModifiedInfo, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: restrictCbData, text: t("addingBots:restrict") }],
            [{ callback_data: banCbData, text: t("addingBots:restrictAndBan") }],
            [{ callback_data: allowedCbData, text: t("addingBots:allow") }],
            this.settingsService.getBackToFeaturesButton(chatId),
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

    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const dbChat = await this.settingsService.resolveChat(ctx, chatId);
    if (!dbChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBots = this.sanitizeValue(value);

    await this.prismaService.$transaction([
      this.prismaService.chat.update({ data: { addingBots }, select: { id: true }, where: { id: chatId } }),
      this.prismaService.upsertChatSettingsHistory(chatId, ctx.callbackQuery.from.id, ChatSettingName.ADDING_BOTS),
    ]);
    await this.prismaService.deleteChatCache(chatId);
    await Promise.all([this.settingsService.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
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
}
