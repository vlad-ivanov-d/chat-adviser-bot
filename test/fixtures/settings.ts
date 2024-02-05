import { AddingBotsAction } from "src/adding-bots/interfaces/action.interface";
import { PAGE_SIZE } from "src/app.constants";
import { ChannelMessageFilterAction } from "src/channel-message-filter/interfaces/action.interface";
import { LanguageAction } from "src/language/interfaces/action.interface";
import { ProfanityFilterAction } from "src/profanity-filter/interfaces/action.interface";
import { SettingsAction } from "src/settings/interfaces/action.interface";
import { VotebanAction } from "src/voteban/interfaces/action.interface";

import { group, privateChat, supergroup } from "./chats";
import { adminUser, bot } from "./users";

/**
 * Webhook payload which contains update about adding the bot to a new chat
 */
export const addedToNewChatWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 1,
    new_chat_member: bot,
    new_chat_members: [bot],
    new_chat_participant: bot,
  },
  update_id: 1,
};

/**
 * Payload for send message request #1. It should be sent as a result of adding the bot to a new chat.
 */
export const addedToNewChatSendMessagePayload1 = {
  chat_id: privateChat.id,
  text:
    "I see that you've added me to a new chat. Perhaps you want to immediately configure this chat? " +
    "Don't forget to give me admin permissions so that all my features are available.",
};

/**
 * Payload for send message request #2. It should be sent as a result of adding the bot to a new chat.
 */
export const addedToNewChatSendMessagePayload2 = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${VotebanAction.SETTINGS}?chatId=${supergroup.id}`, text: "Ban Voting" }],
      [{ callback_data: `${LanguageAction.SETTINGS}?chatId=${supergroup.id}`, text: "Language" }],
      [
        {
          callback_data: `${ChannelMessageFilterAction.SETTINGS}?chatId=${supergroup.id}`,
          text: "Messages On Behalf Of Channels",
        },
      ],
      [{ callback_data: `${ProfanityFilterAction.SETTINGS}?chatId=${supergroup.id}`, text: "Profanity Filter" }],
      [{ callback_data: `${AddingBotsAction.SETTINGS}?chatId=${supergroup.id}`, text: "Restriction On Adding Bots" }],
      [{ callback_data: `${SettingsAction.FEATURES}?chatId=${supergroup.id}&skip=${PAGE_SIZE}`, text: "»" }],
      [{ callback_data: SettingsAction.CHATS, text: "« Back to chats" }],
    ],
  },
  text:
    `Select the feature you want to configure for the @${supergroup.username} chat. The list of features depends ` +
    "on the type of chat (channel, group, etc.).",
};

/**
 * Payload for send message request. It should be sent as a result of group creation.
 */
export const groupCreatedSendMessagePayload = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${VotebanAction.SETTINGS}?chatId=${group.id}`, text: "Ban Voting" }],
      [{ callback_data: `${LanguageAction.SETTINGS}?chatId=${group.id}`, text: "Language" }],
      [
        {
          callback_data: `${ChannelMessageFilterAction.SETTINGS}?chatId=${group.id}`,
          text: "Messages On Behalf Of Channels",
        },
      ],
      [{ callback_data: `${ProfanityFilterAction.SETTINGS}?chatId=${group.id}`, text: "Profanity Filter" }],
      [{ callback_data: `${AddingBotsAction.SETTINGS}?chatId=${group.id}`, text: "Restriction On Adding Bots" }],
      [{ callback_data: `${SettingsAction.FEATURES}?chatId=${group.id}&skip=${PAGE_SIZE}`, text: "»" }],
      [{ callback_data: SettingsAction.CHATS, text: "« Back to chats" }],
    ],
  },
  text:
    `Select the feature you want to configure for the <b>${group.title}</b> chat. The list of features depends ` +
    "on the type of chat (channel, group, etc.).",
};

/**
 * Webhook payload #1 which contains update about group creation. Actually the update contains 2 messages.
 */
export const groupCreatedWebhook1 = {
  my_chat_member: {
    chat: { ...group, all_members_are_administrators: false },
    date: Date.now(),
    from: adminUser,
    new_chat_member: { status: "member", user: bot },
    old_chat_member: { status: "left", user: bot },
  },
  update_id: 1,
};

/**
 * Webhook payload #2 which contains update about group creation. Actually the update contains 2 messages.
 */
export const groupCreatedWebhook2 = {
  message: {
    chat: { ...group, all_members_are_administrators: true },
    date: Date.now(),
    from: adminUser,
    group_chat_created: true,
    message_id: 1,
  },
  update_id: 2,
};

/**
 * Payload for send message request. It should be sent as a result of /mychats command in a private chat.
 */
export const myChatsCommandInPrivateChatSendMessagePayload = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${SettingsAction.FEATURES}?chatId=${privateChat.id}`, text: `@${bot.username}` }],
      [],
      [{ callback_data: SettingsAction.REFRESH, text: "↻ Refresh the list" }],
    ],
  },
  text:
    "Below is a list of chats that are available to me, and where you are an administrator. " +
    "Select the chat for which you want to change the settings.\n\n" +
    "If the list doesn't contain the chat you need, try writing any message in it and clicking the " +
    "<b>↻ Refresh the list</b> button (the last button in this message).",
};

/**
 * Webhook payload which contains update about /mychats command in a private chat
 */
export const myChatsCommandInPrivateChatWebhook = {
  message: {
    chat: privateChat,
    date: Date.now(),
    entities: [{ length: 5, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/mychats",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /mychats command in a private chat.
 */
export const myChatsCommandInSupergroupSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_to_message_id: 1,
  text:
    `Send this command to me in <a href="tg:user?id=${bot.id}">private messages</a> ` +
    "and I'll help you to configure your chats.",
};

/**
 * Webhook payload which contains update about /mychats command in a supergroup chat
 */
export const myChatsCommandInSupergroupWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    entities: [{ length: 5, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/mychats",
  },
  update_id: 1,
};
