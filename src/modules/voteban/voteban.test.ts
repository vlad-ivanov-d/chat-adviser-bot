import { App } from "app";
import { http, type HttpHandler, HttpResponse } from "msw";
import type { Telegraf } from "telegraf";
import { BASE_URL, MESSAGE_DATE } from "test/constants";
import { mockBot } from "test/mockBot";
import { mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { createDbSupergroupChat } from "test/mockDatabase";
import { mockAdminUser, mockUser } from "test/mockUser";
import { server } from "test/setup";

import { VotebanAction } from "./voteban.types";

const botMessageHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockAdminUser(),
          message_id: 2,
          message_thread_id: 1,
          reply_to_message: {
            chat: mockSupergroupChat(),
            date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Bad message",
          },
          text: "voteban",
        },
        update_id: 1,
      },
    ],
  }),
);

const cbSaveSettingsErrorHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        callback_query: {
          chat_instance: "1",
          data: `${VotebanAction.SAVE}?chatId=error_id&v=2`,
          from: mockAdminUser(),
          id: "1",
          message: {
            chat: mockPrivateChat(),
            date: MESSAGE_DATE,
            edit_date: MESSAGE_DATE,
            from: mockBot(),
            message_id: 1,
            text: "Ban Voting",
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
          data: `${VotebanAction.SETTINGS}?chatId=error_id`,
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

const privateChatVotebanCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: { chat: mockPrivateChat(), date: MESSAGE_DATE, from: mockAdminUser(), message_id: 1, text: "voteban" },
        update_id: 1,
      },
    ],
  }),
);

const votebanCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockAdminUser(),
          message_id: 2,
          message_thread_id: 1,
          reply_to_message: {
            chat: mockSupergroupChat(),
            date: MESSAGE_DATE,
            from: mockUser(),
            message_id: 1,
            text: "Bad message",
          },
          text: "voteban",
        },
        update_id: 1,
      },
    ],
  }),
);

const votebanWithNoReplyCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockAdminUser(),
          message_id: 1,
          text: "Voteban",
        },
        update_id: 1,
      },
    ],
  }),
);

describe("Voteban", () => {
  let app: App;
  let bot: Telegraf;

  afterEach(async () => {
    await app.shutdown();
  });

  beforeEach(() => {
    app = new App();
    bot = app.bot;
  });

  it("tells how to use the voteban command correctly", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    server.use(votebanWithNoReplyCommandHandler);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith(
      "You should respond with this command to a message that you consider incorrect in order to start voting " +
        "to ban the user.",
      { reply_to_message_id: 1 },
    );
  });

  it("says if there is no admin permissions", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    server.use(
      http.post(`${BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
      votebanCommandHandler,
    );

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith("I need administrator permissions for this feature to work.", {
      reply_to_message_id: 2,
    });
  });

  it("ignores voteban command if the feature is disabled", async () => {
    server.use(votebanWithNoReplyCommandHandler);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(0);
  });

  it("tells voteban command is not for a private chat", async () => {
    server.use(privateChatVotebanCommandHandler);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith("This command is not for private chats.");
  });

  it("doesn't start voteban against itself", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    server.use(botMessageHandler);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith("I can't start voting to ban myself. This would be weird.", {
      reply_to_message_id: 2,
    });
  });

  it("throws an error if chat id is incorrect during settings rendering", async () => {
    server.use(cbSettingsErrorHandler);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(() => app.initAndProcessUpdates()).rejects.toThrow("Chat is not defined to render voteban settings.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("throws an error if chat id is incorrect during settings saving", async () => {
    server.use(cbSaveSettingsErrorHandler);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(() => app.initAndProcessUpdates()).rejects.toThrow("Chat is not defined to save voteban settings.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
