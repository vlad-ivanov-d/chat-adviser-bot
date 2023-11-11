import { AddingBotsRule } from "@prisma/client";
import { settings, SettingsAction } from "features/settings";
import { changeLanguage, t } from "i18next";
import { CallbackCtx, NewMembersCtx } from "types/context";
import {
  isPrismaChatAdmin,
  joinModifiedInfo,
  prisma,
  upsertPrismaChat,
  upsertPrismaChatSettingsHistory,
} from "utils/prisma";
import { getChatHtmlLink, getUserHtmlLink, kickChatMember } from "utils/telegraf";

export class AddingBots {
  /**
   * Gets available adding bots options
   * @returns Adding bots options
   */
  public getOptions(): { id: AddingBotsRule | null; title: string }[] {
    return [
      { id: AddingBotsRule.restricted, title: t("addingBots:restricted") },
      { id: AddingBotsRule.restrictedAndBan, title: t("addingBots:restrictedAndBan") },
      { id: null, title: t("addingBots:allowed") },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  public async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to render adding bots settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const allowedCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}`;
    const restrictedCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}&v=${AddingBotsRule.restricted}`;
    const restrictedAndBanCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}&v=${AddingBotsRule.restrictedAndBan}`;
    const chatLink = getChatHtmlLink(prismaChat);
    const sanitizedValue = this.sanitizeValue(prismaChat.addingBots);
    const value = this.getOptions().find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("addingBots:set", { CHAT: chatLink, VALUE: value });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, "addingBots", prismaChat), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: restrictedCbData, text: t("addingBots:restrict") }],
            [{ callback_data: restrictedAndBanCbData, text: t("addingBots:restrictAndBan") }],
            [{ callback_data: allowedCbData, text: t("addingBots:allow") }],
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
   * @param value Restrict bots state
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      throw new Error("Chat is not defined to save adding bots settings.");
    }

    const { language } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    await changeLanguage(language);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBots = this.sanitizeValue(value);

    await prisma.$transaction([
      prisma.chat.update({ data: { addingBots }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "addingBots"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Validates new chat members
   * @param ctx NewMembers context
   */
  public async validate(ctx: NewMembersCtx): Promise<void> {
    const { chat, from, new_chat_members: newChatMembers, sender_chat: senderChat } = ctx.update.message;
    const newBots = newChatMembers.filter((m) => m.is_bot && m.id !== ctx.botInfo.id);
    if (newBots.length === 0) {
      return; // No bots were added, return.
    }

    const prismaChat = await upsertPrismaChat(chat, from);
    await changeLanguage(prismaChat.language);

    if (
      isPrismaChatAdmin(prismaChat, from.id, senderChat?.id) || // Current user is an admin
      !isPrismaChatAdmin(prismaChat, ctx.botInfo.id) // Bot is not an admin
    ) {
      return;
    }

    try {
      if (prismaChat.addingBots === AddingBotsRule.restricted) {
        await Promise.all(newBots.map((b) => kickChatMember(chat.id, b.id)));
      }
      if (prismaChat.addingBots === AddingBotsRule.restrictedAndBan && senderChat) {
        const msg = t("addingBots:userBanned", { USER: getChatHtmlLink(senderChat) });
        await ctx.banChatSenderChat(senderChat.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
      if (prismaChat.addingBots === AddingBotsRule.restrictedAndBan && !senderChat) {
        const msg = t("addingBots:userBanned", { USER: getUserHtmlLink(from) });
        await ctx.banChatMember(from.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
    } catch {
      // An expected error may happen when bot has no enough permissions
    }
  }

  /**
   * Sanitizes adding bots rule
   * @param value Value
   * @returns Sanitized value
   */
  private sanitizeValue(value: string | null): AddingBotsRule | null {
    switch (value) {
      case AddingBotsRule.restricted:
      case AddingBotsRule.restrictedAndBan:
        return value;
      default:
        return null;
    }
  }
}

export const addingBots = new AddingBots();
