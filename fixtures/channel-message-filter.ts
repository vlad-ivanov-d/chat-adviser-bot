import { formatInTimeZone } from "date-fns-tz";

import { DATE_FORMAT } from "src/app.constants";
import { ChannelMessageFilterAction } from "src/channel-message-filter/interfaces/action.interface";
import { SettingsAction } from "src/settings/interfaces/action.interface";

import { channel, privateChat, supergroup } from "./chats";
import { adminUser, bot, systemChannelBot, telegram } from "./users";

/**
 * Webhook payload contains channel message which is automatic forward in a supergroup chat
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
    text: "Hello",
  },
  update_id: 1,
};

/**
 * Payload for ban sender chat request. It should be sent as a result of channel message
 * processing in a supergroup chat.
 */
export const banSenderChatPayload = { chat_id: supergroup.id, sender_chat_id: channel.id };

/**
 * Webhook payload which contains save settings callback with incorrect chat id
 */
export const cbSaveSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ChannelMessageFilterAction.SAVE}?cId=error_id&v=FILTER`,
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
          callback_data: `${ChannelMessageFilterAction.SAVE}?cId=${supergroup.id.toString()}&v=FILTER`,
          text: "Enable filter",
        },
      ],
      [{ callback_data: `${ChannelMessageFilterAction.SAVE}?cId=${supergroup.id.toString()}`, text: "Disable filter" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: "« Back to features" }],
    ],
  },
  text:
    "<b>Messages On Behalf Of Channels</b>\nI can filter messages on behalf of channels (not to be confused with " +
    "forwarded messages) in group chats. Users who have their own Telegram channels can write in public chats on " +
    "behalf of the channels. In this way, they can make advertising for themselves or simply anonymize messages " +
    "without fear of ban. Even if the administrator bans a chat channel, the user can create a new channel and " +
    `write on its behalf.\n\n- - -\n\nEnable message filter on behalf of channels in @${supergroup.username ?? ""} ` +
    "chat?\n\nCurrent value: <b>filter disabled</b>",
};

/**
 * Webhook payload which contains settings callback with incorrect chat id
 */
export const cbSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ChannelMessageFilterAction.SETTINGS}?cId=error_id`,
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
    data: `${ChannelMessageFilterAction.SETTINGS}?cId=${supergroup.id.toString()}`,
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
    "<b>Messages On Behalf Of Channels</b>\nI can filter messages on behalf of channels (not to be confused with " +
    "forwarded messages) in group chats. Users who have their own Telegram channels can write in public chats on " +
    "behalf of the channels. In this way, they can make advertising for themselves or simply anonymize messages " +
    "without fear of ban. Even if the administrator bans a chat channel, the user can create a new channel and " +
    `write on its behalf.\n\n- - -\n\nEnable message filter on behalf of channels in @${supergroup.username ?? ""} ` +
    "chat?\n\nCurrent value: <b>filter enabled</b>\n" +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
});

/**
 * Webhook payload which contains save settings callback
 */
export const cbSaveSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${ChannelMessageFilterAction.SAVE}?cId=${supergroup.id.toString()}&v=FILTER`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains channel message in a supergroup chat
 */
export const channelMessageWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: systemChannelBot,
    message_id: 1,
    sender_chat: channel,
    text: "Test",
  },
  update_id: 1,
};

/**
 * Webhook response which contains delete message method
 */
export const deleteMessageWebhookResponse = { chat_id: 12, message_id: 1, method: "deleteMessage" };
