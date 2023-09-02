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
import { getUserHtmlLink, kickChatMember } from "utils/telegraf";

export class AddingBots {
  /**
   * Gets available adding bots options
   * @param lng Language code
   * @returns Adding bots options
   */
  public getOptions(lng: string): { id: AddingBotsRule | null; title: string }[] {
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
  public async renderSettings(ctx: CallbackCtx, chatId: number): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const [{ language: lng }, prismaChat] = await Promise.all([
      upsertPrismaChat(ctx.chat, ctx.callbackQuery.from),
      upsertPrismaChat(chatId, ctx.callbackQuery.from),
    ]);

    const isAdmin = await settings.validateAdminPermissions(ctx, prismaChat, lng);
    if (!isAdmin) {
      return; // User is not an admin anymore, redirect to chat list.
    }

    const allowedCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}`;
    const restrictedCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}&v=${AddingBotsRule.restricted}`;
    const restrictedAndBanCbData = `${SettingsAction.AddingBotsSave}?chatId=${chatId}&v=${AddingBotsRule.restrictedAndBan}`;

    const sanitizedValue = this.sanitizeValue(prismaChat.addingBots);
    const value = this.getOptions(lng).find((o) => o.id === sanitizedValue)?.title ?? "";
    const msg = t("addingBots:set", { CHAT_TITLE: prismaChat.title, VALUE: value, lng });
    await Promise.all([
      ctx.answerCbQuery(),
      ctx.editMessageText(joinModifiedInfo(msg, { lng, prismaChat, settingName: "addingBots" }), {
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
   * Validates new chat members
   * @param ctx NewMembers context
   */
  public async validate(ctx: NewMembersCtx): Promise<void> {
    const { from, new_chat_members: newChatMembers } = ctx.update.message;
    const newChatBots = newChatMembers.filter((m) => m.is_bot);
    if (newChatBots.length === 0) {
      return; // No bots were added, return.
    }
    if (newChatBots.length === 1 && newChatBots[0].id === ctx.botInfo.id) {
      return; // The bot itself was added, return.
    }

    const prismaChat = await upsertPrismaChat(ctx.chat, from);
    if (isPrismaChatAdmin(prismaChat, from.id)) {
      return; // Current user is an admin, return.
    }
    if (!isPrismaChatAdmin(prismaChat, ctx.botInfo.id)) {
      return; // Bot is not an admin, return.
    }

    const { addingBots, language: lng } = prismaChat;
    if (addingBots === AddingBotsRule.restricted || addingBots === AddingBotsRule.restrictedAndBan) {
      const msg = t("addingBots:userBanned", { USER: getUserHtmlLink(from, ctx.chat), lng });
      await Promise.all([
        ...newChatBots.map((b) => kickChatMember(ctx.chat.id, b.id)),
        addingBots === AddingBotsRule.restrictedAndBan &&
          ctx.banChatMember(from.id).then(() => ctx.reply(msg, { parse_mode: "HTML" })),
      ])
        // An expected error may happen when bot was removed from the chat or there are no enough permissions
        .catch(() => undefined);
    }
  }

  /**
   * Saves settings
   * @param ctx Callback context
   * @param chatId Id of the chat which is edited
   * @param value Restrict bots state
   */
  public async saveSettings(ctx: CallbackCtx, chatId: number, value: string | null): Promise<void> {
    if (!ctx.chat || isNaN(chatId)) {
      return; // Something went wrong
    }

    const { from } = ctx.callbackQuery;
    const [{ language: lng }, prismaChat] = await Promise.all([
      upsertPrismaChat(ctx.chat, from),
      upsertPrismaChat(chatId, from),
    ]);

    const isAdmin = await settings.validateAdminPermissions(ctx, prismaChat, lng);
    if (!isAdmin) {
      return; // User is not an admin anymore, return.
    }

    const addingBots = this.sanitizeValue(value);
    await prisma.$transaction([
      prisma.chat.update({ data: { addingBots }, select: { id: true }, where: { id: chatId } }),
      upsertPrismaChatSettingsHistory(chatId, from.id, "addingBots"),
    ]);
    await Promise.all([settings.notifyChangesSaved(ctx, lng), this.renderSettings(ctx, chatId)]);
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
