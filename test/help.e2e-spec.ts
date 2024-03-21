import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/help";
import { AppModule } from "src/app.module";

import { TEST_TELEGRAM_API_BASE_URL, TEST_WEBHOOK_BASE_URL, TEST_WEBHOOK_PATH } from "./utils/constants";
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
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.supergroupHelpWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.supergroupSendMessagePayload);
  });
});
