import { App } from "app";
import { http, type HttpHandler, HttpResponse } from "msw";
import { BASE_URL, MESSAGE_DATE } from "test/constants";
import { mockSupergroupChat } from "test/mockChat";
import { prisma } from "test/mockDatabase";
import { mockAdminUser } from "test/mockUser";
import { server } from "test/setup";

const mediaGroupMessageHandler: HttpHandler = http.post(`${BASE_URL}/getUpdates`, () =>
  HttpResponse.json({
    ok: true,
    result: [
      {
        message: {
          caption: "Hello",
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockAdminUser(),
          media_group_id: "100",
          message_id: 1,
          photo: [
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANzAAM0BA",
              file_size: 2007,
              file_unique_id: "AQADB9YxG48yIEl4",
              height: 90,
              width: 90,
            },
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANtAAM0BA",
              file_size: 25954,
              file_unique_id: "AQADB9YxG48yIEly",
              height: 320,
              width: 320,
            },
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN4AAM0BA",
              file_size: 99406,
              file_unique_id: "AQADB9YxG48yIEl9",
              height: 800,
              width: 800,
            },
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN5AAM0BA",
              file_size: 146396,
              file_unique_id: "AQADB9YxG48yIEl-",
              height: 1280,
              width: 1280,
            },
          ],
        },
        update_id: 1,
      },
      {
        message: {
          chat: mockSupergroupChat(),
          date: MESSAGE_DATE,
          from: mockAdminUser(),
          media_group_id: "100",
          message_id: 2,
          photo: [
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANzAAM0BA",
              file_size: 2007,
              file_unique_id: "AQADB9YxG48yIEl4",
              height: 90,
              width: 90,
            },
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANtAAM0BA",
              file_size: 25954,
              file_unique_id: "AQADB9YxG48yIEly",
              height: 320,
              width: 320,
            },
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN4AAM0BA",
              file_size: 99406,
              file_unique_id: "AQADB9YxG48yIEl9",
              height: 800,
              width: 800,
            },
            {
              file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN5AAM0BA",
              file_size: 146396,
              file_unique_id: "AQADB9YxG48yIEl-",
              height: 1280,
              width: 1280,
            },
          ],
        },
        update_id: 2,
      },
    ],
  }),
);

describe("Messages", () => {
  let app: App;

  afterEach(async () => {
    await app.shutdown();
  });

  beforeEach(() => {
    app = new App();
  });

  it("saves messages with media group id", async () => {
    server.use(mediaGroupMessageHandler);

    await app.initAndProcessUpdates();

    const messages = await prisma.message.findMany();
    expect(messages.length).toBe(2);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          authorId: mockAdminUser().id,
          chatId: mockSupergroupChat().id,
          editorId: mockAdminUser().id,
          mediaGroupId: "100",
          messageId: 1,
        }),
        expect.objectContaining({
          authorId: mockAdminUser().id,
          chatId: mockSupergroupChat().id,
          editorId: mockAdminUser().id,
          mediaGroupId: "100",
          messageId: 2,
        }),
      ]),
    );
  });
});
