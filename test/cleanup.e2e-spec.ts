import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";

import * as fixtures from "fixtures/cleanup";
import { user } from "fixtures/users";
import { AppModule } from "src/app.module";

import { TEST_ASYNC_DELAY, TEST_TG_WEBHOOK_BASE_URL, TEST_TG_WEBHOOK_PATH } from "./constants/common";
import { createDbSupergroupChat, prisma } from "./lib/database";
import { sleep } from "./lib/sleep";

describe("CleanupModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("cleanups unused users at midnight", async () => {
    await prisma.user.create({
      data: {
        authorId: user.id,
        editorId: user.id,
        firstName: user.first_name,
        id: user.id,
        updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        username: user.username,
      },
      select: { id: true },
    });
    jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24h to run the daily cron job
    await sleep(TEST_ASYNC_DELAY);

    const { length } = await prisma.user.findMany({ select: { id: true } });
    expect(length).toBe(0);
  });

  it("deletes the chat in database if the bot was kicked", async () => {
    await createDbSupergroupChat();

    // This event contains 2 separate updates
    const response1 = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.kickedBotWebhook1);
    const response2 = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.kickedBotWebhook2);

    const chats = await prisma.chat.findMany();
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(chats.length).toBe(0);
  });
});
