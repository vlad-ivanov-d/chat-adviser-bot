import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/language";
import * as settingsFixtures from "fixtures/settings";
import { AppModule } from "src/app.module";

import {
  TEST_ASYNC_DELAY,
  TEST_TELEGRAM_API_BASE_URL,
  TEST_WEBHOOK_BASE_URL,
  TEST_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat } from "./utils/database";
import { server } from "./utils/server";
import { sleep } from "./utils/sleep";

describe("LanguageModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("handles an error if chat id is incorrect during settings rendering", async () => {
    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSettingsErrorWebhook);
    expect(response.status).toBe(200);
  });

  it("handles an error if chat id is incorrect during settings saving", async () => {
    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsErrorWebhook);
    expect(response.status).toBe(200);
  });

  it("renders settings", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return new HttpResponse(null, { status: 400 });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ callback_query_id: "1", method: "answerCallbackQuery" });
    expect(editMessageTextPayload).toEqual(fixtures.cbSettingsEditMessageTextPayload);
  });

  it("saves settings", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSaveSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbSaveSettingsEditMessageTextPayload());
  });

  it("saves settings with sanitized value", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.cbSaveIncorrectValueSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbSaveIncorrectValueSettingsEditMessageTextPayload());
  });

  it("should not render settings if the user is not an admin", async () => {
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatAdministrators`, () =>
        HttpResponse.json({ ok: true, result: [] }),
      ),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSettingsNotAdminWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(settingsFixtures.cbSettingsNotAdminEditMessageTextPayload);
  });

  it("should not save settings if the user is not an admin", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatAdministrators`, () =>
        HttpResponse.json({ ok: true, result: [] }),
      ),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbSaveSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSettingsNotAdminWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(settingsFixtures.cbSettingsNotAdminEditMessageTextPayload);
  });
});
