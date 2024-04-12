import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { formatInTimeZone } from "date-fns-tz";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import { privateChat, supergroup } from "fixtures/chats";
import * as settingsFixtures from "fixtures/settings";
import * as fixtures from "fixtures/time-zone";
import { adminUser } from "fixtures/users";
import { DATE_FORMAT } from "src/app.constants";
import { AppModule } from "src/app.module";
import { SettingsAction } from "src/settings/interfaces/action.interface";
import { TimeZoneAction } from "src/time-zone/interfaces/action.interface";

import {
  TEST_ASYNC_DELAY,
  TEST_TELEGRAM_API_BASE_URL,
  TEST_WEBHOOK_BASE_URL,
  TEST_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat } from "./utils/database";
import { server } from "./utils/server";
import { sleep } from "./utils/sleep";

const londonTzId = "Europe/London";

describe("TimeZoneModule (e2e)", () => {
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
    expect(editMessageTextPayload).toEqual({
      chat_id: privateChat.id,
      message_id: 1,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          [{ callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id.toString()}&s=5`, text: "»" }],
          [
            {
              callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`,
              text: fixtures.backToFeaturesText,
            },
          ],
        ],
      },
      text:
        "<b>Time Zone</b>\n" +
        "I can work in different time zones and display dates in the appropriate format.\n\n" +
        `Select a time zone for @${supergroup.username ?? ""} chat.\n\nCurrent time zone: <b>GMT+0 UTC</b>`,
    });
  });

  it("renders specific page of settings if the time zone has already been selected", async () => {
    await createDbSupergroupChat({ timeZone: londonTzId });
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
    expect(editMessageTextPayload).toEqual({
      chat_id: privateChat.id,
      message_id: 1,
      parse_mode: "HTML",
      reply_markup: {
        // Necessary for expectations
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        inline_keyboard: expect.arrayContaining([
          [
            expect.objectContaining({
              callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=Europe%2FLondon`,
            }),
          ],
          [expect.objectContaining({ text: "«" }), expect.objectContaining({ text: "»" })],
          [
            {
              callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`,
              text: fixtures.backToFeaturesText,
            },
          ],
        ]),
      },
      text:
        "<b>Time Zone</b>\nI can work in different time zones and display dates in the appropriate format.\n\n" +
        `Select a time zone for @${supergroup.username ?? ""} chat.\n\nCurrent time zone: ` +
        `<b>${formatInTimeZone(new Date(), londonTzId, "zzz")} ${londonTzId}</b>`,
    });
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
    expect(editMessageTextPayload).toEqual({
      chat_id: privateChat.id,
      message_id: 1,
      parse_mode: "HTML",
      reply_markup: {
        // Necessary for expectations
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        inline_keyboard: expect.arrayContaining([
          [
            expect.objectContaining({
              callback_data: `${TimeZoneAction.SAVE}?cId=${supergroup.id.toString()}&v=Europe%2FLondon`,
            }),
          ],
          [expect.objectContaining({ text: "«" }), expect.objectContaining({ text: "»" })],
          [
            {
              callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`,
              text: fixtures.backToFeaturesText,
            },
          ],
        ]),
      },
      text:
        "<b>Time Zone</b>\n" +
        "I can work in different time zones and display dates in the appropriate format.\n\n" +
        `Select a time zone for @${supergroup.username ?? ""} chat.\n\n` +
        `Current time zone: <b>${formatInTimeZone(new Date(), londonTzId, "zzz")} ${londonTzId}</b>\n` +
        `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
        `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
    });
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
    expect(editMessageTextPayload).toEqual({
      chat_id: privateChat.id,
      message_id: 1,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          expect.arrayContaining([]),
          [{ callback_data: `${TimeZoneAction.SETTINGS}?cId=${supergroup.id.toString()}&s=5`, text: "»" }],
          [
            {
              callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`,
              text: fixtures.backToFeaturesText,
            },
          ],
        ],
      },
      text:
        "<b>Time Zone</b>\nI can work in different time zones and display dates in the appropriate format.\n\n" +
        `Select a time zone for @${supergroup.username ?? ""} chat.\n\nCurrent time zone: <b>GMT+0 Etc/UTC</b>\n` +
        `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
        `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
    });
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
