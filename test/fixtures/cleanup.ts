import { supergroup } from "./chats";
import { adminUser, bot } from "./users";

/**
 * Webhook payload #1 which contains an event that the bot was kicked from a supergroup chat.
 * Actually the update contains 2 messages.
 */
export const kickedBotWebhook1 = {
  my_chat_member: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    new_chat_member: { status: "left", user: bot },
    old_chat_member: { status: "member", user: bot },
  },
  update_id: 1,
};

/**
 * Webhook payload #2 which contains an event that the bot was kicked from a supergroup chat.
 * Actually the update contains 2 messages.
 */
export const kickedBotWebhook2 = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    left_chat_member: bot,
    left_chat_participant: bot,
    message_id: 1,
  },
  update_id: 1,
};
