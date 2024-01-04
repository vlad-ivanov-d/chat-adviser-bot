import { App } from "app";
import { PAGE_SIZE } from "constants/pagination";
import { http, HttpHandler, HttpResponse } from "msw";
import { Telegraf } from "telegraf";
import { MESSAGE_DATE } from "test/constants";
import { createDbPrivateChat } from "test/database";
import { mockBot } from "test/mockBot";
import { mockGroupChat, mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { mockUser } from "test/mockUser";
import { BASE_URL, server } from "test/setup";

const addedToNewChatHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockUser(),
          message_id: 1,
          new_chat_member: mockBot(),
          new_chat_members: [mockBot()],
          new_chat_participant: mockBot(),
        },
        update_id: 1,
      },
    ],
  }),
);

const chatAdminsHandler: HttpHandler = http.post(`${BASE_URL}/getChatAdministrators`, () =>
  HttpResponse.json({ ok: true, result: [{ is_anonymous: false, status: "creator", user: mockUser() }] }),
);

const createdGroupChatHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        my_chat_member: {
          chat: { ...mockGroupChat(), all_members_are_administrators: false },
          date: MESSAGE_DATE,
          from: mockUser(),
          new_chat_member: { status: "member", user: mockBot() },
          old_chat_member: { status: "left", user: mockBot() },
        },
        update_id: 1,
      },
      {
        message: {
          chat: { ...mockGroupChat(), all_members_are_administrators: true },
          date: MESSAGE_DATE,
          from: mockUser(),
          group_chat_created: true,
          message_id: 540,
        },
        update_id: 2,
      },
    ],
  }),
);

const getGroupChatHandler: HttpHandler = http.post(`${BASE_URL}/getChat`, () =>
  HttpResponse.json({ ok: true, result: mockGroupChat() }),
);

const getSupergroupChatHandler: HttpHandler = http.post(`${BASE_URL}/getChat`, () =>
  HttpResponse.json({ ok: true, result: mockSupergroupChat() }),
);

const myChatsCommandPrivateHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockPrivateChat(),
          date: MESSAGE_DATE,
          entities: [{ length: 5, offset: 0, type: "bot_command" }],
          from: mockUser(),
          message_id: 1,
          text: "/mychats",
        },
        update_id: 1,
      },
    ],
  }),
);

const myChatsCommandSupergroupHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          entities: [{ length: 5, offset: 0, type: "bot_command" }],
          from: mockUser(),
          message_id: 1,
          text: "/mychats",
        },
        update_id: 1,
      },
    ],
  }),
);

const settingsSelectChatsMsg =
  "Below is a list of chats that are available to me, and where you are an administrator. " +
  "Select the chat for which you want to change the settings.\n\n" +
  "If the list doesn't contain the chat you need, try writing any message in it and clicking the " +
  "<b>↻ Refresh the list</b> button (the last button in this message).";
const settingsInvitationMsg =
  "I see that you've added me to a new chat. Perhaps you want to immediately configure this chat? " +
  "Don't forget to give me admin permissions so that all my features are available.";

describe("Settings", () => {
  let app: App;
  let bot: Telegraf;

  afterEach(async () => {
    await app.shutdown();
  });

  beforeEach(() => {
    app = new App();
    bot = app.bot;
  });

  it("prompts admin to make settings when adding the bot to a new chat", async () => {
    await createDbPrivateChat();
    server.use(...[addedToNewChatHandler, chatAdminsHandler, getSupergroupChatHandler]);

    let sendMessageSpy;
    bot.use(async (ctx, next) => {
      sendMessageSpy = jest.spyOn(ctx.telegram, "sendMessage").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(sendMessageSpy).toHaveBeenCalledTimes(2);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(1, mockUser().id, settingsInvitationMsg);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(
      2,
      mockUser().id,
      `Select the feature you want to configure for the @${mockSupergroupChat().username} chat. ` +
        "The list of features depends on the type of chat (channel, group, etc.).",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `cfg-vtbn?chatId=${mockSupergroupChat().id}`, text: "Ban Voting" }],
            [{ callback_data: `cfg-lng?chatId=${mockSupergroupChat().id}`, text: "Language" }],
            [{ callback_data: `cfg-moboc?chatId=${mockSupergroupChat().id}`, text: "Messages On Behalf Of Channels" }],
            [{ callback_data: `cfg-pf?chatId=${mockSupergroupChat().id}`, text: "Profanity Filter" }],
            [{ callback_data: `cfg-addng-bts?chatId=${mockSupergroupChat().id}`, text: "Restriction On Adding Bots" }],
            [{ callback_data: `cfg-ftrs?chatId=${mockSupergroupChat().id}&skip=${PAGE_SIZE}`, text: "»" }],
            [{ callback_data: "cfg-chats", text: "« Back to chats" }],
          ],
        },
      },
    );
  });

  it("prompts admin to make settings when a new group chat has been created", async () => {
    await createDbPrivateChat();
    server.use(...[createdGroupChatHandler, chatAdminsHandler, getGroupChatHandler]);

    let sendMessageSpy;
    bot.use(async (ctx, next) => {
      sendMessageSpy = jest.spyOn(ctx.telegram, "sendMessage").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(sendMessageSpy).toHaveBeenCalledTimes(2);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(1, mockUser().id, settingsInvitationMsg);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(
      2,
      mockUser().id,
      `Select the feature you want to configure for the <b>${mockGroupChat().title}</b> chat. ` +
        "The list of features depends on the type of chat (channel, group, etc.).",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: `cfg-vtbn?chatId=${mockGroupChat().id}`, text: "Ban Voting" }],
            [{ callback_data: `cfg-lng?chatId=${mockGroupChat().id}`, text: "Language" }],
            [{ callback_data: `cfg-moboc?chatId=${mockGroupChat().id}`, text: "Messages On Behalf Of Channels" }],
            [{ callback_data: `cfg-pf?chatId=${mockGroupChat().id}`, text: "Profanity Filter" }],
            [{ callback_data: `cfg-addng-bts?chatId=${mockGroupChat().id}`, text: "Restriction On Adding Bots" }],
            [{ callback_data: `cfg-ftrs?chatId=${mockGroupChat().id}&skip=${PAGE_SIZE}`, text: "»" }],
            [{ callback_data: "cfg-chats", text: "« Back to chats" }],
          ],
        },
      },
    );
  });

  it("renders chats as an answer to /mychats command in a private chat", async () => {
    server.use(...[myChatsCommandPrivateHandler]);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith(settingsSelectChatsMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ callback_data: `cfg-ftrs?chatId=${mockPrivateChat().id}`, text: `@${mockBot().username}` }],
          [],
          [{ callback_data: "cfg-rfrsh", text: "↻ Refresh the list" }],
        ],
      },
    });
  });

  it("doesn't render chats as an answer to /mychats command in a supergroup chat", async () => {
    server.use(...[myChatsCommandSupergroupHandler]);

    let replySpy;
    bot.use(async (ctx, next) => {
      replySpy = jest.spyOn(ctx, "reply").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy).toHaveBeenCalledWith(
      `Send this command to me in <a href="tg:user?id=${mockBot().id}">private messages</a> ` +
        "and I'll help you to configure your chats.",
      { parse_mode: "HTML", reply_to_message_id: 1 },
    );
  });
});
