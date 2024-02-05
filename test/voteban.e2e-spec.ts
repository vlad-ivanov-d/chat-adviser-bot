import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/setup";

import { AppModule } from "../src/app.module";
import { TELEGRAM_BOT_API_BASE_URL, TEST_WEBHOOK_BASE_URL, TEST_WEBHOOK_PATH } from "./constants";
import * as fixtures from "./fixtures/voteban";
import { createDbSupergroupChat } from "./utils/database";

describe("VotebanModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("should ignore voteban command if the feature is disabled", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toBe(undefined);
  });

  it("should not start voteban against itself", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanAgainstBotWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAgainstBotSendMessagePayload);
  });

  it("should say if there is no admin permissions", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/getChatAdministrators`, () =>
        HttpResponse.json({ ok: true, result: [] }),
      ),
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.votebanCommandWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanCommandNoAdminPermissionsSendMessagePayload);
  });

  it("should say voteban command is not for a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanCommandInPrivateChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanCommandInPrivateChatSendMessagePayload);
  });

  it("should tell how to use the voteban command correctly", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanWithoutReplySendMessagePayload);
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
});
