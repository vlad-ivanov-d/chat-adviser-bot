import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { LanguageCode } from "@prisma/client";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/profanity-filter";
import * as settingsFixtures from "fixtures/settings";
import { adminUser } from "fixtures/users";
import { AppModule } from "src/app.module";

import {
  TEST_ASYNC_DELAY,
  TEST_TELEGRAM_API_BASE_URL,
  TEST_TELEGRAM_WEBHOOK_BASE_URL,
  TEST_TELEGRAM_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat, createDbUser, prisma } from "./utils/database";
import { server } from "./utils/server";
import { sleep } from "./utils/sleep";

describe("ProfanityFilterModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("filters messages in a new supergroup chat", async () => {
    await prisma.$transaction([
      createDbUser(adminUser),
      prisma.profaneWord.create({
        data: { authorId: adminUser.id, editorId: adminUser.id, language: LanguageCode.EN, word: "bad" },
      }),
    ]);
    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.channelMessageWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.deleteMessageWebhookResponse);
  });

  it("handles an error if chat id is incorrect during settings rendering", async () => {
    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.cbSettingsErrorWebhook);
    expect(response.status).toBe(200);
  });

  it("handles an error if chat id is incorrect during settings saving", async () => {
    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
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

    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.cbSettingsWebhook);

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

    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsWebhook);

    const expectedEditMessageTextPayload = fixtures.cbSaveSettingsEditMessageTextPayload();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(expectedEditMessageTextPayload);
  });

  it("should not filter messages from the linked channel", async () => {
    await prisma.$transaction([
      createDbUser(adminUser),
      prisma.profaneWord.create({
        data: { authorId: adminUser.id, editorId: adminUser.id, language: LanguageCode.EN, word: "bad" },
      }),
    ]);

    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.autoForwardChannelMessageWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("should not filter messages if the feature is disabled", async () => {
    await createDbSupergroupChat();
    await prisma.profaneWord.create({
      data: { authorId: adminUser.id, editorId: adminUser.id, language: LanguageCode.EN, word: "bad" },
    });

    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.channelMessageWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
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

    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.cbSettingsWebhook);

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

    const response = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSettingsNotAdminWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(settingsFixtures.cbSettingsNotAdminEditMessageTextPayload);
  });
});
