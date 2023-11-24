import { http, HttpHandler, HttpResponse } from "msw";
import { mockBot } from "tests/mockBot";
import { mockSupergroupChat } from "tests/mockChat";
import { mockUser } from "tests/mockUser";
import { BASE_URL, initBotAndRunUpdates, server } from "tests/setup";
import { bot } from "utils/telegraf";

const handler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
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

test("the correctness of the response to the /help command in a group chat", async () => {
  let replySpy;
  server.use(...[handler]);
  bot.use(async (ctx, next) => {
    replySpy = jest.spyOn(ctx, "reply").mockImplementation();
    await next();
  });

  await initBotAndRunUpdates(bot);

  expect(replySpy).toHaveBeenCalledWith(
    "Hello! I'm a bot that helps to moderate chats.\n\n<b>Getting started:</b>\n1. add me to chat\n" +
      `2. give me administrator permissions\n3. send a <a href="tg:user?id=${mockBot().id}">private message</a> ` +
      "command /mychats and I will help you set up your chat\n\n<b>Feature list:</b> ban voting, profanity filter, " +
      "restriction on adding bots, support for different languages.\nI'll tell about each feature " +
      "in more detail during setup.\n\nYou can call this message again at any time using the /help command.",
    { parse_mode: "HTML", reply_to_message_id: 1 },
  );
});
