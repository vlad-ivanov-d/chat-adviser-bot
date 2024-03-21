import { TimeZoneAction } from "src/time-zone/interfaces/action.interface";

import { privateChat, supergroup } from "./chats";
import { adminUser, bot } from "./users";

export const backToFeaturesText = "« Back to features";

/**
 * Webhook payload which contains save settings callback with incorrect value
 */
export const cbSaveIncorrectValueSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=incorrect`,
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
    data: `${TimeZoneAction.SAVE}?cId=error_id&v=Europe%2FLondon`,
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
    data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=Europe%2FLondon`,
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
    data: `${TimeZoneAction.SETTINGS}?cId=error_id`,
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
    data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id.toString()}`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};
