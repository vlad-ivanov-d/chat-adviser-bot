import { AddingBotsAction } from "src/adding-bots/interfaces/action.interface";
import { PAGE_SIZE } from "src/app.constants";
import { ChannelMessageFilterAction } from "src/channel-message-filter/interfaces/action.interface";
import { LanguageAction } from "src/language/interfaces/action.interface";
import { ProfanityFilterAction } from "src/profanity-filter/interfaces/action.interface";
import { SettingsAction } from "src/settings/interfaces/action.interface";
import { VotebanAction } from "src/voteban/interfaces/action.interface";

import { group, privateChat, supergroup } from "./chats";
import { adminUser, bot, systemChannelBot } from "./users";

const chatsText =
  "Below is a list of chats that are available to me, and where you are an administrator. " +
  "Select the chat for which you want to change the settings.\n\nIf the list doesn't contain the chat you need, " +
  "try clicking the <b>↻ Refresh the list</b> button (the last button in this message).";
const refreshListText = "↻ Refresh the list";

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
      [{ callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}`, text: "Ban Voting" }],
      [{ callback_data: `${LanguageAction.SETTINGS}?cId=${supergroup.id.toString()}`, text: "Language" }],
      [
        {
          callback_data: `${ChannelMessageFilterAction.SETTINGS}?cId=${supergroup.id.toString()}`,
          text: "Messages On Behalf Of Channels",
        },
      ],
      [
        {
          callback_data: `${ProfanityFilterAction.SETTINGS}?cId=${supergroup.id.toString()}`,
          text: "Profanity Filter",
        },
      ],
      [
        {
          callback_data: `${AddingBotsAction.SETTINGS}?cId=${supergroup.id.toString()}`,
          text: "Restriction On Adding Bots",
        },
      ],
      [
        {
          callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}&s=${PAGE_SIZE.toString()}`,
          text: "»",
        },
      ],
      [{ callback_data: SettingsAction.CHATS, text: "« Back to chats" }],
    ],
  },
  text:
    `Select the feature you want to configure for the @${supergroup.username ?? ""} chat. The list of features ` +
    "depends on the type of chat (channel, group, etc.).",
};

/**
 * Webhook payload which contains update about adding another bot to the chat
 */
export const anotherBotAddedToChatWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 1,
    new_chat_member: systemChannelBot,
    new_chat_members: [systemChannelBot],
    new_chat_participant: systemChannelBot,
  },
  update_id: 1,
};

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback save settings processing.
 */
export const answerCbSaveSettingsWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  show_alert: true,
  text: "Changes saved",
};

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback settings or save settings processing if the user is not an admin.
 */
export const answerCbSettingsNotAdminWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  show_alert: true,
  text: "Unfortunately, this action is no longer available to you.",
};

/**
 * Payload for edit message text request. It should be sent as a result of chats callback.
 */
export const cbChatsEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${SettingsAction.CHATS}?s=0`, text: "«" }],
      [{ callback_data: SettingsAction.REFRESH, text: refreshListText }],
    ],
  },
  text: chatsText,
};

/**
 * Webhook payload which contains chats callback with incorrect skip parameter
 */
export const cbChatsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${SettingsAction.CHATS}?s=error`,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains chats callback
 */
export const cbChatsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${SettingsAction.CHATS}?s=4`,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains features callback
 */
export const cbFeaturesWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains features callback with incorrect skip parameter
 */
export const cbFeaturesErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}&s=error`,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of refresh callback.
 */
export const cbRefreshEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${privateChat.id.toString()}`, text: `@${bot.username}` }],
      [],
      [{ callback_data: SettingsAction.REFRESH, text: refreshListText }],
    ],
  },
  text: chatsText,
};

/**
 * Webhook payload which contains refresh callback
 */
export const cbRefreshWebhook = {
  callback_query: {
    chat_instance: "1",
    data: SettingsAction.REFRESH,
    from: adminUser,
    id: "1",
    message: {
      chat: privateChat,
      date: Date.now(),
      edit_date: Date.now(),
      from: bot,
      message_id: 1,
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of settings or save settings callback
 * if the user is not an admin.
 */
export const cbSettingsNotAdminEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${privateChat.id.toString()}`, text: `@${bot.username}` }],
      [],
      [{ callback_data: SettingsAction.REFRESH, text: "↻ Refresh the list" }],
    ],
  },
  text: chatsText,
};

/**
 * Payload for edit message text request. It should be sent as a result of features callback.
 */
export const featuresEditMessageTextPayload = { ...addedToNewChatSendMessagePayload2, message_id: 1 };

/**
 * Payload for send message request. It should be sent as a result of group creation.
 */
export const groupCreatedSendMessagePayload = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${VotebanAction.SETTINGS}?cId=${group.id.toString()}`, text: "Ban Voting" }],
      [{ callback_data: `${LanguageAction.SETTINGS}?cId=${group.id.toString()}`, text: "Language" }],
      [
        {
          callback_data: `${ChannelMessageFilterAction.SETTINGS}?cId=${group.id.toString()}`,
          text: "Messages On Behalf Of Channels",
        },
      ],
      [{ callback_data: `${ProfanityFilterAction.SETTINGS}?cId=${group.id.toString()}`, text: "Profanity Filter" }],
      [
        {
          callback_data: `${AddingBotsAction.SETTINGS}?cId=${group.id.toString()}`,
          text: "Restriction On Adding Bots",
        },
      ],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${group.id.toString()}&s=${PAGE_SIZE.toString()}`, text: "»" }],
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
export const myChatsInPrivateChatSendMessagePayload = {
  chat_id: privateChat.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${privateChat.id.toString()}`, text: `@${bot.username}` }],
      [],
      [{ callback_data: SettingsAction.REFRESH, text: refreshListText }],
    ],
  },
  text: chatsText,
};

/**
 * Webhook payload which contains update about /mychats command in a private chat
 */
export const myChatsInPrivateChatWebhook = {
  message: {
    chat: privateChat,
    date: Date.now(),
    entities: [{ length: 8, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/mychats",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of /mychats command in a private chat.
 */
export const myChatsInSupergroupSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_parameters: { message_id: 1 },
  text:
    `Send this command to me in <a href="tg:user?id=${bot.id.toString()}">private messages</a> ` +
    "and I'll help you to configure your chats.",
};

/**
 * Webhook payload which contains update about /mychats command in a supergroup chat
 */
export const myChatsInSupergroupWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    entities: [{ length: 8, offset: 0, type: "bot_command" }],
    from: adminUser,
    message_id: 1,
    text: "/mychats",
  },
  update_id: 1,
};
