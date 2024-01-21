import { App } from "app";
import { DATE_FORMAT } from "constants/dates";
import { formatInTimeZone } from "date-fns-tz";
import { http, type HttpHandler, HttpResponse } from "msw";
import type { Telegraf } from "telegraf";
import { BASE_URL, MESSAGE_DATE } from "test/constants";
import { mockBot } from "test/mockBot";
import { mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { createDbSupergroupChat, createDbUser, prisma } from "test/mockDatabase";
import { mockAdminUser, mockUser } from "test/mockUser";
import { server } from "test/setup";
import { sleep } from "test/utils";

import { DELETE_MESSAGE_DELAY, WARNINGS_LIMIT } from "./warnings.constants";
import { WarningsAction } from "./warnings.types";

const cbSaveSettingsErrorHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        callback_query: {
          chat_instance: "1",
          data: `${WarningsAction.SAVE}?chatId=error_id&v=true`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Warnings",
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
          data: `${WarningsAction.SAVE}?chatId=${mockSupergroupChat().id}&v=true`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Warnings",
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
          data: `${WarningsAction.SETTINGS}?chatId=error_id`,
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
          data: `${WarningsAction.SETTINGS}?chatId=${mockSupergroupChat().id}`,
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

const privateChatWarnCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: { chat: mockPrivateChat(), date: MESSAGE_DATE, from: mockAdminUser(), message_id: 1, text: "/warn" },
        update_id: 1,
      },
    ],
  }),
);

const warnCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockAdminUser(),
          message_id: 4,
          message_thread_id: 3,
          reply_to_message: {
            chat: mockSupergroupChat(),
            date: MESSAGE_DATE,
            from: mockUser(),
            message_id: 3,
            text: "Bad message",
          },
          text: "/warn",
        },
        update_id: 3,
      },
    ],
  }),
);

describe("Warnings", () => {
  let app: App;
  let bot: Telegraf;

  afterEach(async () => {
    await app.shutdown();
  });

  beforeEach(() => {
    app = new App();
    bot = app.bot;
  });

  it("bans a user for 3 warnings", async () => {
    await createDbUser();
    await createDbSupergroupChat({ hasWarnings: true });
    await prisma.warning.createMany({
      data: [
        {
          authorId: mockAdminUser().id,
          chatId: mockSupergroupChat().id,
          editorId: mockAdminUser().id,
          messageId: 1,
          userId: mockUser().id,
        },
        {
          authorId: mockAdminUser().id,
          chatId: mockSupergroupChat().id,
          editorId: mockAdminUser().id,
          messageId: 2,
          userId: mockUser().id,
        },
      ],
    });
    server.use(warnCommandHandler);

    let banChatMemberSpy;
    let deleteMessageSpy;
    let sendMessageSpy;
    bot.use(async (ctx, next) => {
      banChatMemberSpy = jest.spyOn(ctx, "banChatMember").mockImplementation(() => Promise.resolve(true));
      deleteMessageSpy = jest.spyOn(ctx, "deleteMessage").mockImplementation(() => Promise.resolve(true));
      sendMessageSpy = jest.spyOn(ctx, "sendMessage").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(deleteMessageSpy).toHaveBeenCalledTimes(1);
    expect(deleteMessageSpy).toHaveBeenCalledWith(4);
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith(
      `<a href="tg:user?id=${mockUser().id}">@${mockUser().username}</a>, you are receiving a warning for violating ` +
        `the rules. The warning is valid for 90 days. If you receive ${WARNINGS_LIMIT} warnings, ` +
        `you will be banned.\n\nNumber of warnings: <b>${WARNINGS_LIMIT} of ${WARNINGS_LIMIT}</b>`,
      { parse_mode: "HTML", reply_to_message_id: 3 },
    );
    expect(banChatMemberSpy).toHaveBeenCalledTimes(1);
    expect(banChatMemberSpy).toHaveBeenCalledWith(mockUser().id);
    // Have to use sleep instead of jest.useFakeTimers() because of issues with telegraf library
    await sleep(DELETE_MESSAGE_DELAY);
    expect(deleteMessageSpy).toHaveBeenCalledTimes(2);
    expect(deleteMessageSpy).toHaveBeenCalledWith(3);
  }, 15000);

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
      "<b>Warnings</b>\n" +
        "I can issue warnings to users upon admin command. To give a warning to a user, respond to their message " +
        "with the appropriate command. In this case, the user's message will be deleted. Each warning is valid " +
        "for 90 days, then it is automatically removed. If 3 warnings are received, the user will be banned. " +
        "A warning cannot be issued to an administrator.\n/warn - issue a warning\n\nEnable warnings in " +
        `@${mockSupergroupChat().username} chat?\n\nCurrent value: <b>disabled</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `cfg-wrn-sv?chatId=${mockSupergroupChat().id}&v=true`, text: "Enable" }],
            [{ callback_data: `cfg-wrn-sv?chatId=${mockSupergroupChat().id}`, text: "Disable" }],
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
      "<b>Warnings</b>\n" +
        "I can issue warnings to users upon admin command. To give a warning to a user, respond to their message " +
        "with the appropriate command. In this case, the user's message will be deleted. Each warning is valid " +
        "for 90 days, then it is automatically removed. If 3 warnings are received, the user will be banned. " +
        "A warning cannot be issued to an administrator.\n/warn - issue a warning\n\nEnable warnings in " +
        `@${mockSupergroupChat().username} chat?\n\nCurrent value: <b>enabled</b>\n` +
        `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
        `by <a href="tg:user?id=${mockAdminUser().id}">@${mockAdminUser().username}</a>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `cfg-wrn-sv?chatId=${mockSupergroupChat().id}&v=true`, text: "Enable" }],
            [{ callback_data: `cfg-wrn-sv?chatId=${mockSupergroupChat().id}`, text: "Disable" }],
            [{ callback_data: `cfg-ftrs?chatId=${mockSupergroupChat().id}`, text: "« Back to features" }],
          ],
        },
      },
    );
  });

  it("tells warn command is not for a private chat", async () => {
    server.use(privateChatWarnCommandHandler);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith("This command is not for private chats.");
  });

  it("throws an error if chat id is incorrect during settings rendering", async () => {
    server.use(cbSettingsErrorHandler);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(() => app.initAndProcessUpdates()).rejects.toThrow("Chat is not defined to render warnings settings.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("throws an error if chat id is incorrect during settings saving", async () => {
    server.use(cbSaveSettingsErrorHandler);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(() => app.initAndProcessUpdates()).rejects.toThrow("Chat is not defined to save warnings settings.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
