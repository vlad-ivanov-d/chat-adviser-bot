import { App } from "app";
import { http, type HttpHandler, HttpResponse } from "msw";
import type { Telegraf } from "telegraf";
import { MESSAGE_DATE } from "test/constants";
import { createDbSupergroupChat } from "test/database";
import { mockBot } from "test/mockBot";
import { mockSupergroupChat } from "test/mockChat";
import { mockUser } from "test/mockUser";
import { BASE_URL, server } from "test/setup";

const chatAdminsHandler: HttpHandler = http.post(`${BASE_URL}/getChatAdministrators`, () =>
  HttpResponse.json({ ok: true, result: [{ is_anonymous: false, status: "administrator", user: mockBot() }] }),
);

const votebanCommandHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
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

  it("tells how to use the help command correctly in a supergroup chat", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    server.use(...[chatAdminsHandler, votebanCommandHandler]);

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
});
