import { SettingsAction } from "src/settings/interfaces/action.interface";

import { privateChat, supergroup } from "./chats";
import { adminUser, bot } from "./users";

/**
 * Payload for send message request. It should be sent as a result of /start command processing in a private chat.
 */
export const privateStartSendMessagePayload1 = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  text:
    "Hello! I'm a bot that helps to moderate chats.\n\n" +
    "<b>Getting started:</b>\n" +
    "1. add me to chat\n" +
    "2. give me administrator permissions\n" +
    `3. send a <a href="tg:user?id=${bot.id.toString()}">private message</a> command /mychats and I will help ` +
    "you set up your chat\n\n" +
    "<b>Feature list:</b> ban voting, profanity filter, restriction on adding bots, support for different " +
    "languages, etc.\n" +
    "I'll tell about each feature in more detail during setup.\n\n" +
    "You can call this message again at any time using the /help command.",
};

/**
 * Payload for send message request. It should be sent as a result of /start command processing in a private chat.
 */
export const privateStartSendMessagePayload2 = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${privateChat.id.toString()}`, text: `@${bot.username}` }],
      [],
      [{ callback_data: SettingsAction.REFRESH, text: "↻ Refresh the list" }],
    ],
  },
  text:
    "Below is a list of chats that are available to me, and where you are an administrator. " +
    "Select the chat for which you want to change the settings.\n\nIf the list doesn't contain the chat you need, " +
    "try clicking the <b>↻ Refresh the list</b> button (the last button in this message).",
};

/**
 * Webhook payload which contains /start command in a private chat
 */
export const privateStartWebhook = {
  message: {
    chat: privateChat,
    date: Date.now(),
    entities: [{ length: 6, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/start",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /help command processing in a supergroup chat.
 */
export const supergroupHelpSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_parameters: { message_id: 1 },
  text:
    "Hello! I'm a bot that helps to moderate chats.\n\n" +
    "<b>Getting started:</b>\n" +
    "1. add me to chat\n" +
    "2. give me administrator permissions\n" +
    `3. send a <a href="tg:user?id=${bot.id.toString()}">private message</a> command /mychats and I will help ` +
    "you set up your chat\n\n" +
    "<b>Feature list:</b> ban voting, profanity filter, restriction on adding bots, support for different " +
    "languages, etc.\n" +
    "I'll tell about each feature in more detail during setup.\n\n" +
    "You can call this message again at any time using the /help command.",
};

/**
 * Webhook payload which contains /help command in a supergroup chat
 */
export const supergroupHelpWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    entities: [{ length: 5, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/help",
  },
  update_id: 1,
};
