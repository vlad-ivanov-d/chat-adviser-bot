import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/server";

import { AppModule } from "../src/app.module";
import { privateChat, supergroup } from "./fixtures/chats";
import * as settingsFixtures from "./fixtures/settings";
import { adminUser, bot, user } from "./fixtures/users";
import * as fixtures from "./fixtures/warnings";
import {
  ASYNC_REQUEST_DELAY,
  TELEGRAM_API_BASE_URL,
  TEST_WEBHOOK_BASE_URL,
  TEST_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat, createDbUser, prisma } from "./utils/database";
import { sleep } from "./utils/sleep";

describe("WarningsModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("should ban a user for 3 warnings", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    await prisma.$transaction([
      createDbUser(),
      prisma.warning.createMany({
        data: [
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 1, userId: user.id },
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 2, userId: user.id },
        ],
      }),
    ]);
    let banChatMemberPayload;
    let deleteMessagePayload;
    let sendMessagePayload1: unknown;
    let sendMessagePayload2: unknown;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/banChatMember`, async (info) => {
        banChatMemberPayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: true });
      }),
      http.post(`${TELEGRAM_API_BASE_URL}/deleteMessage`, async (info) => {
        deleteMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        const body = await info.request.json();
        sendMessagePayload1 = sendMessagePayload1 ?? body;
        sendMessagePayload2 = sendMessagePayload1 ? body : undefined;
        return HttpResponse.json({ ok: true, result: { message_id: 5 } });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ chat_id: supergroup.id, message_id: 4, method: "deleteMessage" });
    await sleep(ASYNC_REQUEST_DELAY);
    expect(banChatMemberPayload).toEqual({ chat_id: supergroup.id, user_id: user.id });
    expect(sendMessagePayload1).toEqual(fixtures.warnSendMessagePayload);
    expect(sendMessagePayload2).toEqual(fixtures.banSendMessagePayload);

    jest.runOnlyPendingTimers();
    await sleep(ASYNC_REQUEST_DELAY);
    expect(deleteMessagePayload).toEqual({ chat_id: supergroup.id, message_id: 3 });
  });

  it("should handle an error if chat id is incorrect during settings rendering", async () => {
    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSettingsErrorWebhook);
    expect(response.status).toBe(200);
  });

  it("should handle an error if chat id is incorrect during settings saving", async () => {
    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsErrorWebhook);
    expect(response.status).toBe(200);
  });

  it("should ignore /warn command if the feature is disabled", async () => {
    await createDbSupergroupChat();

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("should not issue a warning against the admin", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/getChatMember`, () =>
        HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "administrator", user } }),
      ),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnAgainstAdminSendMessagePayload);
  });

  it("should not issue a warning against the bot itself", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnAgainstBotWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnAgainstBotSendMessagePayload);
  });

  it("should render settings", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ callback_query_id: "1", method: "answerCallbackQuery" });
    expect(editMessageTextPayload).toEqual(fixtures.cbSettingsEditMessageTextPayload);
  });

  it("should save settings", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSaveSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbSaveSettingsEditMessageTextPayloadFunc());
  });

  it("should say if the bot has no admin permissions", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnBotHasNoAdminPermsSendMessagePayload);
  });

  it("should say if the user has no admin permissions", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/getChatAdministrators`, () =>
        HttpResponse.json({ ok: true, result: [{ is_anonymous: false, status: "administrator", user: bot }] }),
      ),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnUserHasNoAdminPermsSendMessagePayload);
  });

  it("should say /warn command is not for a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnInPrivateChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual({ chat_id: privateChat.id, text: "This command is not for private chats." });
  });

  it("should tell how to use the /warn command correctly", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnWithoutReplySendMessagePayload);
  });
});
