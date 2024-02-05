import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/setup";

import { AppModule } from "../src/app.module";
import { ASYNC_REQUEST_DELAY, TELEGRAM_BOT_API_BASE_URL, TEST_WEBHOOK_BASE_URL, TEST_WEBHOOK_PATH } from "./constants";
import { supergroup } from "./fixtures/chats";
import { adminUser, user } from "./fixtures/users";
import * as fixtures from "./fixtures/warnings";
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
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/banChatMember`, async (info) => {
        banChatMemberPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/deleteMessage`, async (info) => {
        deleteMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnCommandWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ chat_id: supergroup.id, message_id: 4, method: "deleteMessage" });
    await sleep(ASYNC_REQUEST_DELAY);
    expect(banChatMemberPayload).toEqual({ chat_id: supergroup.id, user_id: user.id });
    expect(sendMessagePayload).toEqual(fixtures.warnCommandSendMessagePayload);

    jest.runOnlyPendingTimers();
    await sleep(ASYNC_REQUEST_DELAY);
    expect(deleteMessagePayload).toEqual({ chat_id: supergroup.id, message_id: 3 });
  });

  it("should ignore /warn command if the feature is disabled", async () => {
    await createDbSupergroupChat();

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("should not issue a warning against the bot itself", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
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
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/editMessageText`, async (info) => {
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
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSaveSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbSaveSettingsEditMessageTextPayload);
  });

  it("should tell how to use the /warn command correctly", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
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
