import { privateChat, supergroup } from "./chats";
import { adminUser, bot } from "./users";

/**
 * Payload for send message request. It should be sent as a result of /start command processing in a private chat.
 */
export const privateHelpSendMessagePayload = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  text:
    "Hello! I'm a bot that helps to moderate chats.\n" +
    "\n" +
    "<b>Getting started:</b>\n" +
    "1. add me to chat\n" +
    "2. give me administrator permissions\n" +
    `3. send a <a href="tg:user?id=${bot.id}">private message</a> command /mychats and I will help you set up ` +
    "your chat\n" +
    "\n" +
    "<b>Feature list:</b> ban voting, profanity filter, restriction on adding bots, support for different " +
    "languages.\n" +
    "I'll tell about each feature in more detail during setup.\n" +
    "\n" +
    "You can call this message again at any time using the /help command.",
};

/**
 * Webhook payload which contains /start command in a private chat
 */
export const privateHelpWebhook = {
  message: {
    chat: privateChat,
    date: Date.now(),
    entities: [{ length: 5, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/start",
  },
  update_id: 1,
};

/**
 * Response for send message request
 */
export const sendMessageResponse = { ok: true };

/**
 * Payload for send message request. It should be sent as a result of /help command processing in a supergroup chat.
 */
export const supergroupSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_to_message_id: 1,
  text: privateHelpSendMessagePayload.text,
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
