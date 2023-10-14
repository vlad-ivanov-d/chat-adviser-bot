import { AddingBotsRule } from "@prisma/client";
import { settings, SettingsAction } from "features/settings";
import { t } from "i18next";
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
   * @param lng Language code
   * @returns Adding bots options
   */
  getOptions(lng: string): { id: AddingBotsRule | null; title: string }[] {
    return [
      { id: null, title: t("addingBots:allowed", { lng }) },
      { id: AddingBotsRule.restricted, title: t("addingBots:restricted", { lng }) },
      { id: AddingBotsRule.restrictedAndBan, title: t("addingBots:restrictedAndBan", { lng }) },
    ];
  }

  /**
   * Renders settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   */
  async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const allowedCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}`;
    const restrictedCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}&v=${AddingBotsRule.restricted}`;
    const restrictedAndBanCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}&v=${AddingBotsRule.restrictedAndBan}`;
    const sanitizedValue = this.sanitizeValue(prismaChat.addingBots);
    const value = this.getOptions(lng).find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("addingBots:set", { CHAT_TITLE: prismaChat.displayTitle, VALUE: value, lng });

    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, prismaChat: prismaChat, settingName: "addingBots" }), {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: allowedCbData, text: t("addingBots:allow", { lng }) }],
            [{ callback_data: restrictedCbData, text: t("addingBots:restrict", { lng }) }],
            [{ callback_data: restrictedAndBanCbData, text: t("addingBots:restrictAndBan", { lng }) }],
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
   * @param value Restrict bots state
   */
  async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.callbackQuery.from);
    const prismaChat = await settings.resolvePrismaChat(ctx, chatId, lng);
    if (!prismaChat) {
      return; // The user is no longer an administrator, or the bot has been banned from the chat.
    }

    const addingBots = this.sanitizeValue(value);

    await prisma.$transaction([
      prisma.chat.update({ data: { addingBots }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, ctx.callbackQuery.from.id, "addingBots"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx, lng), this.renderSettings(ctx, chatId)]);
  }

  /**
   * Validates new chat members
   * @param ctx NewMembers context
   */
  async validate(ctx: NewMembersCtx): Promise<void> {
    const { chat, from, new_chat_members: newChatMembers, sender_chat: senderChat } = ctx.update.message;
    const newBots = newChatMembers.filter((m) => m.is_bot && m.id !== ctx.botInfo.id);
    if (newBots.length === 0) {
      return; // No bots were added, return.
    }

    const prismaChat = await upsertPrismaChat(chat, from);

    const { addingBots, language: lng } = prismaChat;
    if (isPrismaChatAdmin(prismaChat, from.id, senderChat?.id)) {
      return; // Current user is an admin, return.
    }
    if (!isPrismaChatAdmin(prismaChat, ctx.botInfo.id)) {
      return; // Bot is not an admin, return.
    }
    try {
      if (addingBots === AddingBotsRule.restricted) {
        await Promise.all(newBots.map((b) => kickChatMember(chat.id, b.id)));
      }
      if (addingBots === AddingBotsRule.restrictedAndBan && senderChat) {
        const msg = t("addingBots:userBanned", { USER: getChatHtmlLink(senderChat), lng });
        await ctx.banChatSenderChat(senderChat.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
      if (addingBots === AddingBotsRule.restrictedAndBan && !senderChat) {
        const msg = t("addingBots:userBanned", { USER: getUserHtmlLink(from), lng });
        await ctx.banChatMember(from.id);
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
    } catch {
      // An expected error may happen when bot have no enough permissions
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
