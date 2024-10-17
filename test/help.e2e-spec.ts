import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/help";
import { AppModule } from "src/app.module";

import { TEST_TG_API_BASE_URL, TEST_TG_WEBHOOK_BASE_URL, TEST_TG_WEBHOOK_PATH } from "./utils/constants";
import { server } from "./utils/server";

describe("HelpModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("answers to /help command in a supergroup chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.supergroupHelpWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.supergroupHelpSendMessagePayload);
  });

  it("answers to /start command in a private chat", async () => {
    let sendMessagePayload1: unknown;
    let sendMessagePayload2: unknown;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        const body = await info.request.json();
        sendMessagePayload2 = sendMessagePayload1 ? body : undefined;
        sendMessagePayload1 = sendMessagePayload1 ?? body;
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.privateStartWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload1).toEqual(fixtures.privateStartSendMessagePayload1);
    expect(sendMessagePayload2).toEqual(fixtures.privateStartSendMessagePayload2);
  });

  it("ignores /help command if it has payload", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.helpWithPayloadWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toBeUndefined();
  });
});
