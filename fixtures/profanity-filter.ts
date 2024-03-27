import { formatInTimeZone } from "date-fns-tz";

import { DATE_FORMAT } from "src/app.constants";
import { ProfanityFilterAction } from "src/profanity-filter/interfaces/action.interface";
import { SettingsAction } from "src/settings/interfaces/action.interface";

import { channel, privateChat, supergroup } from "./chats";
import { adminUser, bot, telegram, user } from "./users";

/**
 * Webhook payload contains channel message with a bad word which is automatic forward in a supergroup chat
 */
export const autoForwardChannelMessageWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    forward_date: Date.now(),
    forward_from_chat: channel,
    forward_from_message_id: 1,
    forward_origin: { chat: channel, date: Date.now(), message_id: 1, type: "channel" },
    from: telegram,
    is_automatic_forward: true,
    message_id: 1,
    sender_chat: channel,
    text: "This message has a bad word",
  },
  update_id: 1,
};

/**
 * Webhook payload which contains save settings callback with incorrect chat id
 */
export const cbSaveSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ProfanityFilterAction.SAVE}?cId=error_id&v=FILTER`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of settings callback.
 */
export const cbSettingsEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        {
          callback_data: `${ProfanityFilterAction.SAVE}?cId=${supergroup.id.toString()}&v=FILTER`,
          text: "Enable",
        },
      ],
      [{ callback_data: `${ProfanityFilterAction.SAVE}?cId=${supergroup.id.toString()}`, text: "Disable" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: "« Back to features" }],
    ],
  },
  text:
    "<b>Profanity Filter</b>\nI can filter profanity in chat, including usernames. " +
    "The filter won't be applied to messages from administrators.\n\n" +
    `Enable profanity filter in @${supergroup.username ?? ""} chat?\n\n` +
    "Current value: <b>disabled</b>",
};

/**
 * Webhook payload which contains settings callback with incorrect chat id
 */
export const cbSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ProfanityFilterAction.SETTINGS}?cId=error_id`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains settings callback
 */
export const cbSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ProfanityFilterAction.SETTINGS}?cId=${supergroup.id.toString()}`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains save settings edit message payload.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveSettingsEditMessageTextPayload = (): unknown => ({
  ...cbSettingsEditMessageTextPayload,
  text:
    "<b>Profanity Filter</b>\nI can filter profanity in chat, including usernames. " +
    "The filter won't be applied to messages from administrators.\n\n" +
    `Enable profanity filter in @${supergroup.username ?? ""} chat?\n\n` +
    "Current value: <b>enabled</b>\n" +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
});

/**
 * Webhook payload which contains save settings callback
 */
export const cbSaveSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ProfanityFilterAction.SAVE}?cId=${supergroup.id.toString()}&v=FILTER`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains message with a bad word in a supergroup chat
 */
export const channelMessageWebhook = {
  message: { chat: supergroup, date: Date.now(), from: user, message_id: 1, text: "This message has a bad word" },
  update_id: 1,
};

/**
 * Webhook response which contains delete message method
 */
export const deleteMessageWebhookResponse = { chat_id: 12, message_id: 1, method: "deleteMessage" };
