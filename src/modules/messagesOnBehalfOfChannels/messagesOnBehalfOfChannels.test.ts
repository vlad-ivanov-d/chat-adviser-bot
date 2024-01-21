import { App } from "app";
import { DATE_FORMAT } from "constants/dates";
import { formatInTimeZone } from "date-fns-tz";
import { http, type HttpHandler, HttpResponse } from "msw";
import type { Telegraf } from "telegraf";
import { BASE_URL, MESSAGE_DATE } from "test/constants";
import { mockBot, mockChannelBot } from "test/mockBot";
import { mockChannelChat, mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { createDbSupergroupChat } from "test/mockDatabase";
import { mockAdminUser } from "test/mockUser";
import { server } from "test/setup";

import { MessagesOnBehalfOfChannelsAction } from "./messagesOnBehalfOfChannels.types";

const cbSaveSettingsErrorHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        callback_query: {
          chat_instance: "1",
          data: `${MessagesOnBehalfOfChannelsAction.SAVE}?chatId=error_id&v=FILTER`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Messages On Behalf Of Channels",
          },
        },
        update_id: 1,
      },
    ],
  }),
);

const cbSaveSettingsHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        callback_query: {
          chat_instance: "1",
          data: `${MessagesOnBehalfOfChannelsAction.SAVE}?chatId=${mockSupergroupChat().id}&v=FILTER`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Messages On Behalf Of Channels",
          },
        },
        update_id: 1,
      },
    ],
  }),
);

const cbSettingsErrorHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        callback_query: {
          chat_instance: "1",
          data: `${MessagesOnBehalfOfChannelsAction.SETTINGS}?chatId=error_id`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Select the feature",
          },
        },
        update_id: 1,
      },
    ],
  }),
);

const cbSettingsHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        callback_query: {
          chat_instance: "1",
          data: `${MessagesOnBehalfOfChannelsAction.SETTINGS}?chatId=${mockSupergroupChat().id}`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Select the feature",
          },
        },
        update_id: 1,
      },
    ],
  }),
);

const messageHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockChannelBot(),
          message_id: 1,
          sender_chat: mockChannelChat(),
          text: "Test message",
        },
        update_id: 1,
      },
    ],
  }),
);

describe("MessagesOnBehalfOfChannels", () => {
  let app: App;
  let bot: Telegraf;

  afterEach(async () => {
    await app.shutdown();
  });

  beforeEach(() => {
    app = new App();
    bot = app.bot;
  });

  it("filters messages on behalf of channels in a new supergroup chat", async () => {
    server.use(messageHandler);

    let banChatSenderChatSpy;
    let deleteMessageSpy;
    bot.use(async (ctx, next) => {
      banChatSenderChatSpy = jest.spyOn(ctx, "banChatSenderChat").mockImplementation();
      deleteMessageSpy = jest.spyOn(ctx, "deleteMessage").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(banChatSenderChatSpy).toHaveBeenCalledTimes(1);
    expect(banChatSenderChatSpy).toHaveBeenCalledWith(mockChannelChat().id);
    expect(deleteMessageSpy).toHaveBeenCalledTimes(1);
    expect(deleteMessageSpy).toHaveBeenCalledWith(1);
  });

  it("doesn't filter messages on behalf of channels if the feature is disabled", async () => {
    await createDbSupergroupChat();
    server.use(messageHandler);

    let banChatSenderChatSpy;
    let deleteMessageSpy;
    bot.use(async (ctx, next) => {
      banChatSenderChatSpy = jest.spyOn(ctx, "banChatSenderChat").mockImplementation();
      deleteMessageSpy = jest.spyOn(ctx, "deleteMessage").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(banChatSenderChatSpy).toHaveBeenCalledTimes(0);
    expect(deleteMessageSpy).toHaveBeenCalledTimes(0);
  });

  it("renders settings", async () => {
    await createDbSupergroupChat();
    server.use(cbSettingsHandler);

    let answerCbQuerySpy;
    let editMessageTextSpy;
    bot.use(async (ctx, next) => {
      answerCbQuerySpy = jest.spyOn(ctx, "answerCbQuery").mockImplementation();
      editMessageTextSpy = jest.spyOn(ctx, "editMessageText").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(answerCbQuerySpy).toHaveBeenCalledTimes(1);
    expect(answerCbQuerySpy).toHaveBeenCalledWith();
    expect(editMessageTextSpy).toHaveBeenCalledTimes(1);
    expect(editMessageTextSpy).toHaveBeenCalledWith(
      "<b>Messages On Behalf Of Channels</b>\n" +
        "I can filter messages on behalf of channels (not to be confused with forwarded messages). " +
        "Users who have their own Telegram channels can write in public chats on behalf of the channels. " +
        "In this way, they can make additional advertising for themselves or simply anonymize messages " +
        "without fear of ban. Even if the administrator bans a chat channel, the user can create a new channel " +
        "and write on its behalf.\n\nEnable message filter on behalf of channels in " +
        `@${mockSupergroupChat().username} chat?\n\nCurrent value: <b>filter disabled</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `cfg-moboc-sv?chatId=${mockSupergroupChat().id}&v=FILTER`, text: "Enable filter" }],
            [{ callback_data: `cfg-moboc-sv?chatId=${mockSupergroupChat().id}`, text: "Disable filter" }],
            [{ callback_data: `cfg-ftrs?chatId=${mockSupergroupChat().id}`, text: "« Back to features" }],
          ],
        },
      },
    );
  });

  it("saves settings", async () => {
    await createDbSupergroupChat();
    server.use(cbSaveSettingsHandler);

    let answerCbQuerySpy;
    let editMessageTextSpy;
    bot.use(async (ctx, next) => {
      answerCbQuerySpy = jest.spyOn(ctx, "answerCbQuery").mockImplementation();
      editMessageTextSpy = jest.spyOn(ctx, "editMessageText").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(answerCbQuerySpy).toHaveBeenCalledTimes(2);
    expect(answerCbQuerySpy).toHaveBeenNthCalledWith(1, "Changes saved", { show_alert: true });
    expect(answerCbQuerySpy).toHaveBeenNthCalledWith(2);
    expect(editMessageTextSpy).toHaveBeenCalledTimes(1);
    expect(editMessageTextSpy).toHaveBeenCalledWith(
      "<b>Messages On Behalf Of Channels</b>\n" +
        "I can filter messages on behalf of channels (not to be confused with forwarded messages). " +
        "Users who have their own Telegram channels can write in public chats on behalf of the channels. " +
        "In this way, they can make additional advertising for themselves or simply anonymize messages " +
        "without fear of ban. Even if the administrator bans a chat channel, the user can create a new channel " +
        "and write on its behalf.\n\nEnable message filter on behalf of channels in " +
        `@${mockSupergroupChat().username} chat?\n\nCurrent value: <b>filter enabled</b>\n` +
        `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
        `by <a href="tg:user?id=${mockAdminUser().id}">@${mockAdminUser().username}</a>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `cfg-moboc-sv?chatId=${mockSupergroupChat().id}&v=FILTER`, text: "Enable filter" }],
            [{ callback_data: `cfg-moboc-sv?chatId=${mockSupergroupChat().id}`, text: "Disable filter" }],
            [{ callback_data: `cfg-ftrs?chatId=${mockSupergroupChat().id}`, text: "« Back to features" }],
          ],
        },
      },
    );
  });

  it("throws an error if chat id is incorrect during settings rendering", async () => {
    server.use(cbSettingsErrorHandler);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(() => app.initAndProcessUpdates()).rejects.toThrow(
      "Chat is not defined to render messages on behalf of channels filter settings.",
    );
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("throws an error if chat id is incorrect during settings saving", async () => {
    server.use(cbSaveSettingsErrorHandler);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(() => app.initAndProcessUpdates()).rejects.toThrow(
      "Chat is not defined to save messages on behalf of channels filter settings.",
    );
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
