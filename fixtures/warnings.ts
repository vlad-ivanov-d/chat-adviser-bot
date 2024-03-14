import { formatInTimeZone } from "date-fns-tz";

import { DATE_FORMAT } from "src/app.constants";
import { SettingsAction } from "src/settings/interfaces/action.interface";
import { WarningsAction } from "src/warnings/interfaces/action.interface";
import { WARNINGS_LIMIT } from "src/warnings/warnings.constants";

import { channel, privateChat, supergroup } from "./chats";
import { adminUser, bot, systemChannelBot, telegram, user } from "./users";

/**
 * Payload for send message request. It should be sent as a result of /warn command processing.
 */
export const banSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_parameters: { message_id: 5 },
  text: "User is banned",
};

/**
 * Webhook payload which contains save settings callback with incorrect value
 */
export const cbSaveIncorrectValueSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${WarningsAction.SAVE}?cId=${supergroup.id}&v=incorrect`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains save settings callback with incorrect chat id
 */
export const cbSaveSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${WarningsAction.SAVE}?cId=error_id&v=true`,
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
      [{ callback_data: `${WarningsAction.SAVE}?cId=${supergroup.id}&v=true`, text: "Enable" }],
      [{ callback_data: `${WarningsAction.SAVE}?cId=${supergroup.id}`, text: "Disable" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id}`, text: "« Back to features" }],
    ],
  },
  text:
    "<b>Warnings</b>\nI can issue warnings to users by admin command. To do this, respond to the user's message with " +
    "the appropriate command. In this case, the user's message will be deleted. Each warning is valid for " +
    `90 days, then it is automatically removed. If ${WARNINGS_LIMIT} warnings are received, the user will ` +
    `be banned.\n\n/warn - issue a warning\n\nEnable warnings in @${supergroup.username} chat?\n\nCurrent value: ` +
    "<b>disabled</b>",
};

/**
 * Webhook payload which contains settings callback with incorrect chat id
 */
export const cbSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${WarningsAction.SETTINGS}?cId=error_id`,
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
    data: `${WarningsAction.SETTINGS}?cId=${supergroup.id}`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of save settings callback with incorrect value.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveIncorrectValueSettingsEditMessageTextPayload = (): unknown => ({
  ...cbSettingsEditMessageTextPayload,
  text:
    "<b>Warnings</b>\nI can issue warnings to users by admin command. To do this, respond to the user's message " +
    "with the appropriate command. In this case, the user's message will be deleted. Each warning is valid for " +
    "90 days, then it is automatically removed. If 3 warnings are received, the user will be banned.\n\n" +
    `/warn - issue a warning\n\nEnable warnings in @${supergroup.username} chat?\n\nCurrent value: <b>disabled</b>\n` +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id}">@${adminUser.username}</a>`,
});

/**
 * Payload for edit message text request. It should be sent as a result of save settings callback.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveSettingsEditMessageTextPayload = (): unknown => ({
  ...cbSettingsEditMessageTextPayload,
  text:
    "<b>Warnings</b>\nI can issue warnings to users by admin command. To do this, respond to the user's message " +
    "with the appropriate command. In this case, the user's message will be deleted. Each warning is valid for " +
    "90 days, then it is automatically removed. If 3 warnings are received, the user will be banned.\n\n" +
    `/warn - issue a warning\n\nEnable warnings in @${supergroup.username} chat?\n\nCurrent value: <b>enabled</b>\n` +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id}">@${adminUser.username}</a>`,
});

/**
 * Webhook payload which contains save settings callback
 */
export const cbSaveSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${WarningsAction.SAVE}?cId=${supergroup.id}&v=true`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains unknown callback
 */
export const cbUnknownWebhook = {
  callback_query: {
    chat_instance: "1",
    data: "unknown",
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /warn command against the admin.
 */
export const warnAgainstAdminSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 4 },
  text: "I can't issue a warning to the administrator. It would be incorrect.",
};

/**
 * Payload for send message request. It should be sent as a result of /warn command against the bot itself.
 */
export const warnAgainstBotSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 2 },
  text: "I can't issue a warning to myself. This would be weird.",
};

/**
 * Webhook payload which contains /warn command against the bot itself
 */
export const warnAgainstBotWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 2,
    message_thread_id: 1,
    reply_to_message: { chat: supergroup, date: Date.now(), from: bot, message_id: 1, text: "Bad message" },
    text: "/warn",
  },
  update_id: 1,
};

/**
 * Webhook payload which contains /warn command against the linked channel
 */
export const warnAgainstLinkedChannelWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 4,
    message_thread_id: 1,
    reply_to_message: {
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
    text: "/warn",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /warn command processing in a supergroup chat
 * without admin permissions for the bot.
 */
export const warnBotHasNoAdminPermsSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 4 },
  text: "I need administrator permissions for this feature to work.",
};

/**
 * Webhook payload which contains /warn command in a private chat
 */
export const warnInPrivateChatWebhook = {
  message: { chat: privateChat, date: Date.now(), from: adminUser, message_id: 1, text: "/warn" },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /warn command in a supergroup chat.
 */
export const warnSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_parameters: { allow_sending_without_reply: true, message_id: 3 },
  text:
    `<a href="tg:user?id=${user.id}">@${user.username}</a>, you are receiving a warning for violating the rules. ` +
    `The warning is valid for 90 days. If you receive ${WARNINGS_LIMIT} warnings, you will be banned.\n\n` +
    `Number of warnings: <b>${WARNINGS_LIMIT} of ${WARNINGS_LIMIT}</b>`,
};

/**
 * Payload for send message request. It should be sent as a result of /warn command
 * for a sender chat in a supergroup chat.
 */
export const warnSenderChatSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_parameters: { allow_sending_without_reply: true, message_id: 3 },
  text:
    `@${channel.username}, you are receiving a warning for violating the rules. ` +
    `The warning is valid for 90 days. If you receive ${WARNINGS_LIMIT} warnings, you will be banned.\n\n` +
    `Number of warnings: <b>${WARNINGS_LIMIT} of ${WARNINGS_LIMIT}</b>`,
};

/**
 * Payload for send message request. It should be sent as a result of /warn command processing in a supergroup chat
 * without admin permissions for the user.
 */
export const warnUserHasNoAdminPermsSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 4 },
  text: "This command is only available to administrators.",
};

/**
 * Webhook payload which contains /warn command for message media group in a supergroup chat
 */
export const warnMediaGroupWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 4,
    message_thread_id: 3,
    reply_to_message: {
      chat: supergroup,
      date: Date.now(),
      from: user,
      media_group_id: "100",
      message_id: 3,
      text: "Bad photos",
    },
    text: "/warn",
  },
  update_id: 1,
};

/**
 * Webhook payload which contains /warn command for sender chat in a supergroup chat
 */
export const warnSenderChatWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 4,
    message_thread_id: 3,
    reply_to_message: {
      chat: supergroup,
      date: Date.now(),
      from: systemChannelBot,
      message_id: 3,
      sender_chat: channel,
      text: "Sender chat message",
    },
    text: "/warn",
  },
  update_id: 1,
};

/**
 * Webhook payload which contains /warn command in a supergroup chat
 */
export const warnWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 4,
    message_thread_id: 3,
    reply_to_message: { chat: supergroup, date: Date.now(), from: user, message_id: 3, text: "Bad message" },
    text: "/warn",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /warn command without a reply processing
 * in a supergroup chat.
 */
export const warnWithoutReplySendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 1 },
  text:
    "You should respond with this command to a message that you consider incorrect in order " +
    "to issue a warning to the user.",
};

/**
 * Webhook payload which contains /warn command without a reply in a supergroup chat
 */
export const warnWithoutReplyWebhook = {
  message: { chat: supergroup, date: Date.now(), from: adminUser, message_id: 1, text: "/warn" },
  update_id: 1,
};
