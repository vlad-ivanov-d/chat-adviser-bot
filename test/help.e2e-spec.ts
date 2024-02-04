import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/setup";

import { AppModule } from "../src/app.module";
import { TELEGRAM_BOT_API_BASE_URL, TEST_WEBHOOK_BASE_URL, TEST_WEBHOOK_PATH } from "./constants";
import * as fixtures from "./fixtures/help";

describe("HelpModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("should answer to /help command in a supergroup chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json(fixtures.sendMessageResponse);
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.supergroupHelpWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toMatchObject(fixtures.supergroupSendMessagePayload);
  });

  it("should answer to /start command in a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_BOT_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json(fixtures.sendMessageResponse);
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.privateHelpWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toMatchObject(fixtures.privateHelpSendMessagePayload);
  });
});
