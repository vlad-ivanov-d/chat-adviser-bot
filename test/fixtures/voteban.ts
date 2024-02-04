import { VotebanAction } from "src/voteban/interfaces/action.interface";

import { privateChat, supergroup } from "./chats";
import { adminUser, bot, user } from "./users";

/**
 * Webhook payload which contains voteban settings callback with incorrect chat id
 */
export const cbSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SETTINGS}?chatId=error_id`,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "Select the feature",
    },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains voteban save settings callback with incorrect chat id
 */
export const cbSaveSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SAVE}?chatId=error_id&v=2`,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "Ban Voting",
    },
  },
  update_id: 1,
};

/**
 * Response for send message request
 */
export const sendMessageResponse = { ok: true };

/**
 * Payload for send message request. It should be sent as a result of voteban command against the bot itself.
 */
export const votebanAgainstBotSendMessagePayload = {
  chat_id: supergroup.id,
  reply_to_message_id: 2,
  text: "I can't start voting to ban myself. This would be weird.",
};

/**
 * Webhook payload which contains voteban command against the bot itself
 */
export const votebanAgainstBotWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 2,
    message_thread_id: 1,
    reply_to_message: { chat: supergroup, date: Date.now(), from: bot, message_id: 1, text: "Bad message" },
    text: "voteban",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command processing in a private chat.
 */
export const votebanCommandInPrivateChatSendMessagePayload = {
  chat_id: privateChat.id,
  text: "This command is not for private chats.",
};

/**
 * Webhook payload which contains voteban command in a private chat
 */
export const votebanCommandInPrivateChatWebhook = {
  message: { chat: privateChat, date: Date.now(), from: adminUser, message_id: 1, text: "voteban" },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command processing in a supergroup chat.
 */
export const votebanCommandNoAdminPermissionsSendMessagePayload = {
  chat_id: supergroup.id,
  reply_to_message_id: 2,
  text: "I need administrator permissions for this feature to work.",
};

/**
 * Webhook payload which contains voteban command
 */
export const votebanCommandWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 2,
    message_thread_id: 1,
    reply_to_message: { chat: supergroup, date: Date.now(), from: user, message_id: 1, text: "Bad message" },
    text: "voteban",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command without a reply processing
 * in a supergroup chat.
 */
export const votebanWithoutReplySendMessagePayload = {
  chat_id: supergroup.id,
  reply_to_message_id: 1,
  text:
    "You should respond with this command to a message that you consider incorrect in order to start voting " +
    "to ban the user.",
};

/**
 * Webhook payload which contains voteban command without a reply
 */
export const votebanWithoutReplyWebhook = {
  message: { chat: supergroup, date: Date.now(), from: adminUser, message_id: 1, text: "Voteban" },
  update_id: 1,
};
