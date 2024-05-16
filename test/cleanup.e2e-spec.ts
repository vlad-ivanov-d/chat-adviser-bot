import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/cleanup";
import { AppModule } from "src/app.module";

import { TEST_ASYNC_DELAY, TEST_TELEGRAM_WEBHOOK_BASE_URL, TEST_TELEGRAM_WEBHOOK_PATH } from "./utils/constants";
import { createDbPrivateChat, createDbSupergroupChat, prisma } from "./utils/database";
import { sleep } from "./utils/sleep";

describe("CleanupModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("cleanups unused private chats and users at midnight", async () => {
    await createDbPrivateChat();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24h to run the daily cron job
    await sleep(TEST_ASYNC_DELAY);

    const chats = await prisma.chat.findMany();
    expect(chats.length).toBe(0);
  });

  it("deletes the chat in database if the bot was kicked", async () => {
    await createDbSupergroupChat();

    // This event contains 2 separate updates
    const response1 = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.kickedBotWebhook1);
    const response2 = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.kickedBotWebhook2);

    const chats = await prisma.chat.findMany();
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(chats.length).toBe(0);
  });
});
