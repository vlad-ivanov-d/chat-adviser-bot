import { formatInTimeZone } from "date-fns-tz";
import { DATE_FORMAT } from "src/app.constants";
import { LanguageAction } from "src/language/interfaces/action.interface";
import { SettingsAction } from "src/settings/interfaces/action.interface";

import { privateChat, supergroup } from "./chats";
import { adminUser, bot } from "./users";

/**
 * Webhook payload which contains save settings callback with incorrect value
 */
export const cbSaveIncorrectValueSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${LanguageAction.SAVE}?cId=${supergroup.id}&v=incorrect`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains save settings callback
 */
export const cbSaveSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${LanguageAction.SAVE}?cId=${supergroup.id}&v=RU`,
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
      [{ callback_data: `${LanguageAction.SAVE}?cId=${supergroup.id}&v=EN`, text: "English" }],
      [{ callback_data: `${LanguageAction.SAVE}?cId=${supergroup.id}&v=RU`, text: "Русский" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id}`, text: "« Back to features" }],
    ],
  },
  text:
    "<b>Language</b>\n" +
    "I can communicate in different languages so that chat users can understand me.\n\n" +
    "Select a language for @test_supergroup chat.\n\nCurrent language: <b>English</b>",
};

/**
 * Payload for edit message text request. It should be sent as a result of save settings callback with incorrect value.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveIncorrectValueSettingsEditMessageTextPayload = (): unknown => ({
  ...cbSettingsEditMessageTextPayload,
  text:
    "<b>Language</b>\nI can communicate in different languages so that chat users can understand me.\n\n" +
    "Select a language for @test_supergroup chat.\n\nCurrent language: <b>English</b>\n" +
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
    "<b>Language</b>\nI can communicate in different languages so that chat users can understand me.\n\n" +
    "Select a language for @test_supergroup chat.\n\nCurrent language: <b>Русский</b>\n" +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id}">@${adminUser.username}</a>`,
});

/**
 * Webhook payload which contains save settings callback with incorrect chat id
 */
export const cbSaveSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${LanguageAction.SAVE}?cId=error_id&v=EN`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains settings callback with incorrect chat id
 */
export const cbSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${LanguageAction.SETTINGS}?cId=error_id`,
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
    data: `${LanguageAction.SETTINGS}?cId=${supergroup.id}`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};
