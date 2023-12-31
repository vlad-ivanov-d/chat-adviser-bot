import { App } from "app";
import { http, HttpHandler, HttpResponse } from "msw";
import { Telegraf } from "telegraf";
import { mockBot } from "test/mockBot";
import { mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { mockUser } from "test/mockUser";
import { BASE_URL, server } from "test/setup";

const privateChatHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockPrivateChat(),
          date: 1577826000000,
          entities: [{ length: 5, offset: 0, type: "bot_command" }],
          from: mockUser(),
          message_id: 1,
          text: "/start",
        },
        update_id: 1,
      },
    ],
  }),
);

const supergroupChatHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: 1577826000000,
          entities: [{ length: 5, offset: 0, type: "bot_command" }],
          from: mockUser(),
          message_id: 1,
          text: "/help",
        },
        update_id: 1,
      },
    ],
  }),
);

const commonHelpMessage =
  "Hello! I'm a bot that helps to moderate chats.\n\n<b>Getting started:</b>\n1. add me to chat\n" +
  `2. give me administrator permissions\n3. send a <a href="tg:user?id=${mockBot().id}">private message</a> ` +
  "command /mychats and I will help you set up your chat\n\n<b>Feature list:</b> ban voting, profanity filter, " +
  "restriction on adding bots, support for different languages.\nI'll tell about each feature " +
  "in more detail during setup.\n\nYou can call this message again at any time using the /help command.";

describe("Help", () => {
  let app: App;
  let bot: Telegraf;

  afterEach(async () => {
    await app.shutdown();
  });

  beforeEach(() => {
    app = new App();
    bot = app.bot;
  });

  it("answers to /start command in a private chat", async () => {
    server.use(...[privateChatHandler]);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith(commonHelpMessage, { parse_mode: "HTML", reply_to_message_id: undefined });
  });

  it("answers to /help command in supergroup chat", async () => {
    server.use(...[supergroupChatHandler]);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith(commonHelpMessage, { parse_mode: "HTML", reply_to_message_id: 1 });
  });
});
