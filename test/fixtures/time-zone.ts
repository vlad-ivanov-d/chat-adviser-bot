import { formatInTimeZone } from "date-fns-tz";
import { DATE_FORMAT } from "src/app.constants";
import { SettingsAction } from "src/settings/interfaces/action.interface";
import { TimeZoneAction } from "src/time-zone/interfaces/action.interface";

import { privateChat, supergroup } from "./chats";
import { adminUser, bot } from "./users";

const backToFeaturesText = "« Back to features";

/**
 * Webhook payload which contains save settings callback with incorrect value
 */
export const cbSaveIncorrectValueSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=incorrect`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of save settings callback.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveSettingsEditMessageTextPayload = (): unknown => ({
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FJersey`, text: "GMT+0 Europe/Jersey" }],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FLisbon`, text: "GMT+0 Europe/Lisbon" }],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FLondon`, text: "GMT+0 Europe/London" }],
      [
        {
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Africa%2FAlgiers`,
          text: "GMT+1 Africa/Algiers",
        },
      ],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Africa%2FBangui`, text: "GMT+1 Africa/Bangui" }],
      [
        { callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id}&s=185`, text: "«" },
        { callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id}&s=195`, text: "»" },
      ],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Time Zone</b>\n" +
    "I can work in different time zones and display dates in the appropriate format.\n\n" +
    `Select a time zone for @${supergroup.username} chat.\n\nCurrent time zone: <b>GMT+0 Europe/London</b>\n` +
    `Modified at ${formatInTimeZone(Date.now(), "Europe/London", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id}">@${adminUser.username}</a>`,
});

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
    data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FLondon`,
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
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Pacific%2FMidway`,
          text: "GMT-11 Pacific/Midway",
        },
      ],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Pacific%2FNiue`, text: "GMT-11 Pacific/Niue" }],
      [
        {
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Pacific%2FPago_Pago`,
          text: "GMT-11 Pacific/Pago_Pago",
        },
      ],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=America%2FAdak`, text: "GMT-10 America/Adak" }],
      [
        {
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Pacific%2FHonolulu`,
          text: "GMT-10 Pacific/Honolulu",
        },
      ],
      [{ callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id}&s=5`, text: "»" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Time Zone</b>\n" +
    "I can work in different time zones and display dates in the appropriate format.\n\n" +
    `Select a time zone for @${supergroup.username} chat.\n\nCurrent time zone: <b>GMT+0 UTC</b>`,
};

/**
 * Payload for edit message text request. It should be sent as a result of save settings callback with incorrect value.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveIncorrectValueSettingsEditMessageTextPayload = (): unknown => ({
  ...cbSettingsEditMessageTextPayload,
  text:
    "<b>Time Zone</b>\nI can work in different time zones and display dates in the appropriate format.\n\n" +
    `Select a time zone for @${supergroup.username} chat.\n\nCurrent time zone: <b>GMT+0 Etc/UTC</b>\n` +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id}">@${adminUser.username}</a>`,
});

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
    data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id}`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of settings callback with existed value.
 */
export const cbSettingsWithValueEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FJersey`, text: "GMT+0 Europe/Jersey" }],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FLisbon`, text: "GMT+0 Europe/Lisbon" }],

      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Europe%2FLondon`, text: "GMT+0 Europe/London" }],
      [
        {
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Africa%2FAlgiers`,
          text: "GMT+1 Africa/Algiers",
        },
      ],
      [{ callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id}&v=Africa%2FBangui`, text: "GMT+1 Africa/Bangui" }],
      [
        { callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id}&s=185`, text: "«" },
        { callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id}&s=195`, text: "»" },
      ],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Time Zone</b>\nI can work in different time zones and display dates in the appropriate format.\n\n" +
    `Select a time zone for @${supergroup.username} chat.\n\nCurrent time zone: <b>GMT+0 Europe/London</b>`,
};
