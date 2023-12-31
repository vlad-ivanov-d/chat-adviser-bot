import { ChatType, LanguageCode, PrismaClient } from "@prisma/client";
import { App } from "app";
import { http, HttpHandler, HttpResponse } from "msw";
import { Telegraf } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { mockBot } from "test/mockBot";
import { mockPrivateChat, mockSupergroupChat } from "test/mockChat";
import { mockUser } from "test/mockUser";
import { BASE_URL, server } from "test/setup";
import { getChatDisplayTitle } from "utils/telegraf";

const addedToNewChatHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          chat: mockSupergroupChat(),
          date: 1577826000000,
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

const getChatHandler: HttpHandler = http.post(`${BASE_URL}/getChat`, () =>
  HttpResponse.json({ ok: true, result: mockPrivateChat() }),
);

const settingSelectFeatureMessage =
  `Select the feature you want to configure for the @${mockBot().username} chat. ` +
  "The list of features depends on the type of chat (channel, group, etc.).";
const settingsInvitationMessage =
  "I see that you've added me to a new chat. Perhaps you want to immediately configure this chat? " +
  "Don't forget to give me admin permissions so that all my features are available.";
const selectFeaturesReplyMarkup: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      {
        callback_data: `cfg-lng?chatId=${mockSupergroupChat().id}`,
        text: "Language",
      },
    ],
    [
      {
        callback_data: `cfg-tz-sv?chatId=${mockSupergroupChat().id}`,
        text: "Time Zone",
      },
    ],
    [],
    [{ callback_data: "cfg-chats", text: "« Back to chats" }],
  ],
};

describe("Settings", () => {
  let app: App;
  let bot: Telegraf;
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await app.shutdown();
  });

  beforeAll(async () => {
    await prisma.user.create({
      data: { authorId: mockUser().id, editorId: mockUser().id, firstName: mockUser().first_name, id: mockUser().id },
    });
    await prisma.chat.create({
      data: {
        authorId: mockUser().id,
        displayTitle: getChatDisplayTitle(mockPrivateChat()),
        editorId: mockUser().id,
        id: mockPrivateChat().id,
        language: LanguageCode.EN,
        membersCount: 2,
        timeZone: "UTC",
        type: ChatType.PRIVATE,
      },
    });
    await prisma.chat.create({
      data: {
        admins: { connect: { id: mockUser().id } },
        authorId: mockUser().id,
        displayTitle: getChatDisplayTitle(mockSupergroupChat()),
        editorId: mockUser().id,
        id: mockSupergroupChat().id,
        language: LanguageCode.EN,
        membersCount: 2,
        timeZone: "UTC",
        type: ChatType.SUPERGROUP,
      },
    });
  });

  beforeEach(() => {
    app = new App();
    bot = app.bot;
  });

  it("prompts admin to make settings when adding the bot to a new chat", async () => {
    server.use(...[addedToNewChatHandler, chatAdminsHandler, getChatHandler]);

    let sendMessageSpy;
    bot.use(async (ctx, next) => {
      sendMessageSpy = jest.spyOn(ctx.telegram, "sendMessage").mockImplementation();
      await next();
    });

    await app.initAndProcessUpdates();

    expect(sendMessageSpy).toHaveBeenCalledTimes(2);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(1, mockUser().id, settingsInvitationMessage);
    expect(sendMessageSpy).toHaveBeenNthCalledWith(2, mockUser().id, settingSelectFeatureMessage, {
      parse_mode: "HTML",
      reply_markup: selectFeaturesReplyMarkup,
    });
  });
});
