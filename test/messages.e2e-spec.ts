import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/messages";
import { AppModule } from "src/app.module";

import { TEST_ASYNC_DELAY, TEST_TELEGRAM_WEBHOOK_BASE_URL, TEST_TELEGRAM_WEBHOOK_PATH } from "./utils/constants";
import { createDbSupergroupChat, prisma } from "./utils/database";
import { sleep } from "./utils/sleep";

describe("MessagesModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("cleanups old saved messages at midnight", async () => {
    await createDbSupergroupChat();
    await prisma.message.create({ data: fixtures.oldSavedMessage, select: { id: true } });
    jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24h to run the daily cron job
    await sleep(TEST_ASYNC_DELAY);

    const savedMessages = await prisma.message.findMany();
    expect(savedMessages.length).toBe(0);
  });

  it("saves messages with media group id", async () => {
    const response1 = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.supergroupMessage1Webhook);
    const response2 = await request(TEST_TELEGRAM_WEBHOOK_BASE_URL)
      .post(TEST_TELEGRAM_WEBHOOK_PATH)
      .send(fixtures.supergroupMessage2Webhook);

    const savedMessages = await prisma.message.findMany();
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(savedMessages.length).toBe(2);
    expect(savedMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining(fixtures.savedMessage1),
        expect.objectContaining(fixtures.savedMessage2),
      ]),
    );
  });
});
