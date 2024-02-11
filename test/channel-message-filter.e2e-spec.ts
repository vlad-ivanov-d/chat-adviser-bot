import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/setup-after-env";

import { AppModule } from "../src/app.module";
import * as fixtures from "./fixtures/channel-message-filter";
import {
  ASYNC_REQUEST_DELAY,
  TELEGRAM_API_BASE_URL,
  TEST_WEBHOOK_BASE_URL,
  TEST_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat } from "./utils/database";
import { sleep } from "./utils/sleep";

describe("ChannelMessageFilterModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("should filter channel messages in a new supergroup chat", async () => {
    let banChatSenderChatPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/banChatSenderChat`, async (info) => {
        banChatSenderChatPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.channelMessageWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.deleteMessageWebhookResponse);
    expect(banChatSenderChatPayload).toEqual(fixtures.banSenderChatPayload);
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

  it("should not filter channel messages if the feature is disabled", async () => {
    await createDbSupergroupChat();
    let banChatSenderChatPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/banChatSenderChat`, async (info) => {
        banChatSenderChatPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.channelMessageWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
    expect(banChatSenderChatPayload).toBe(undefined);
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
    expect(response.body).toEqual(fixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbSaveSettingsEditMessageTextPayloadFunc());
  });
});
