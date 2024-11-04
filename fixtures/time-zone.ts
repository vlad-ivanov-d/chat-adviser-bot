import { format, formatInTimeZone } from "date-fns-tz";

import { DATE_FORMAT } from "src/app.constants";
import { SettingsAction } from "src/settings/interfaces/action.interface";
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
 * Webhook payload which contains save sanitized settings edit message payload.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveSanitizedSettingsEditMessageTextPayload = (): unknown => ({
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      [{ callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id.toString()}&s=5`, text: "»" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Time Zone</b>\n" +
    "I can work in different time zones and display dates in the appropriate format.\n\n- - -\n\n" +
    `Select a time zone for @${supergroup.username ?? ""} chat.\n\nCurrent time zone: <b>GMT+0 Etc/UTC</b>\n` +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
});

/**
 * Webhook payload which contains save settings edit message payload.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveSettingsEditMessageTextPayload = (): unknown => ({
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    // Necessary for expectations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    inline_keyboard: expect.arrayContaining([
      [
        expect.objectContaining({
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=Europe%2FLondon`,
        }),
      ],
      [expect.objectContaining({ text: "«" }), expect.objectContaining({ text: "»" })],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: backToFeaturesText }],
    ]),
  },
  text:
    "<b>Time Zone</b>\n" +
    "I can work in different time zones and display dates in the appropriate format.\n\n- - -\n\n" +
    `Select a time zone for @${supergroup.username ?? ""} chat.\n\n` +
    `Current time zone: <b>${format(Date.now(), "O", { timeZone: "Europe/London" })} Europe/London</b>\n` +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
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
    data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=Europe%2FLondon`,
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
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      expect.arrayContaining([]),
      [{ callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id.toString()}&s=5`, text: "»" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Time Zone</b>\nI can work in different time zones and display dates in the appropriate format.\n\n- - -\n\n" +
    `Select a time zone for @${supergroup.username ?? ""} chat.\n\nCurrent time zone: <b>GMT+0 UTC</b>`,
};

/**
 * Payload for edit message text request. It should be sent as a result of settings callback on a specific page.
 */
export const cbSettingsPageEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    // Necessary for expectations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    inline_keyboard: expect.arrayContaining([
      [
        expect.objectContaining({
          callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=Europe%2FLondon`,
        }),
      ],
      [expect.objectContaining({ text: "«" }), expect.objectContaining({ text: "»" })],
      [
        {
          callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`,
          text: backToFeaturesText,
        },
      ],
    ]),
  },
  text:
    "<b>Time Zone</b>\nI can work in different time zones and display dates in the appropriate format.\n\n- - -\n\n" +
    `Select a time zone for @${supergroup.username ?? ""} chat.\n\nCurrent time zone: ` +
    `<b>${format(Date.now(), "O", { timeZone: "Europe/London" })} Europe/London</b>`,
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
