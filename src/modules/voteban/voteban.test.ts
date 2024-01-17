import { App } from "app";
import { http, type HttpHandler, HttpResponse } from "msw";
import type { Telegraf } from "telegraf";
import { MESSAGE_DATE } from "test/constants";
import { mockBot } from "test/mockBot";
import { mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { createDbSupergroupChat } from "test/mockDatabase";
import { mockUser, mockUser2 } from "test/mockUser";
import { BASE_URL, server } from "test/setup";

const chatAdminsHandler: HttpHandler = http.post(`${BASE_URL}/getChatAdministrators`, () =>
  HttpResponse.json({ ok: true, result: [{ is_anonymous: false, status: "administrator", user: mockBot() }] }),
);

const chatMemberHandler: HttpHandler = http.post(`${BASE_URL}/getChatMember`, () =>
  HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "member", user: mockUser2() } }),
);

const privateChatVotebanCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: { chat: mockPrivateChat(), date: MESSAGE_DATE, from: mockUser(), message_id: 1, text: "voteban" },
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
          from: mockUser(),
          message_id: 2,
          message_thread_id: 1,
          reply_to_message: {
            chat: mockSupergroupChat(),
            date: MESSAGE_DATE,
            from: mockUser2(),
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
        message: { chat: mockSupergroupChat(), date: MESSAGE_DATE, from: mockUser(), message_id: 1, text: "Voteban" },
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
    server.use(chatAdminsHandler, votebanWithNoReplyCommandHandler);

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
    server.use(chatMemberHandler, votebanCommandHandler);

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
    server.use(chatAdminsHandler, votebanWithNoReplyCommandHandler);

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
});
