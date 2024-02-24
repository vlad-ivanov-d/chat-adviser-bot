import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/server";

import { AppModule } from "../src/app.module";
import { privateChat, supergroup } from "./fixtures/chats";
import * as settingsFixtures from "./fixtures/settings";
import { adminUser, user } from "./fixtures/users";
import * as fixtures from "./fixtures/voteban";
import {
  ASYNC_REQUEST_DELAY,
  TELEGRAM_API_BASE_URL,
  TEST_WEBHOOK_BASE_URL,
  TEST_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat, createDbUser, prisma } from "./utils/database";
import { sleep } from "./utils/sleep";

describe("VotebanModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("should accept the vote", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    await prisma.$transaction([
      createDbUser(user),
      prisma.voteban.create({
        data: {
          authorId: adminUser.id,
          candidateId: user.id,
          chatId: supergroup.id,
          editorId: adminUser.id,
          messageId: 3,
        },
        select: { id: true },
      }),
    ]);
    let editMessageTextPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbNoBanEditMessageTextPayload);
  });

  it("should answer if the voting has expired", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteExpiredWebhookResponse);
  });

  it("should ban by voting results", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    const [, voteban] = await prisma.$transaction([
      createDbUser(user),
      prisma.voteban.create({
        data: {
          authorId: adminUser.id,
          candidateId: user.id,
          chatId: supergroup.id,
          editorId: adminUser.id,
          messageId: 3,
        },
        select: { id: true },
      }),
    ]);
    await prisma.votebanBanVoter.create({
      data: { authorId: user.id, editorId: user.id, votebanId: voteban.id },
      select: { id: true },
    });
    let banChatMemberPayload;
    let deleteMessagePayload;
    let editMessageTextPayload;
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/banChatMember`, async (info) => {
        banChatMemberPayload = await info.request.json();
        return new HttpResponse(null, { status: 400 });
      }),
      http.post(`${TELEGRAM_API_BASE_URL}/deleteMessage`, async (info) => {
        deleteMessagePayload = await info.request.json();
        return new HttpResponse(null, { status: 400 });
      }),
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(banChatMemberPayload).toEqual({ chat_id: supergroup.id, user_id: user.id });
    expect(deleteMessagePayload).toEqual({ chat_id: supergroup.id, message_id: 1 });
    expect(editMessageTextPayload).toEqual(fixtures.cbBanEditMessageTextPayload);
    expect(sendMessagePayload).toEqual({ chat_id: 12, reply_to_message_id: 3, text: "Voting completed" });
  });

  it("should cancel the voting if the feature is disabled", async () => {
    await createDbSupergroupChat();
    await prisma.$transaction([
      createDbUser(user),
      prisma.voteban.create({
        data: {
          authorId: adminUser.id,
          candidateId: user.id,
          chatId: supergroup.id,
          editorId: adminUser.id,
          messageId: 3,
        },
        select: { id: true },
      }),
    ]);
    let editMessageTextPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbCancelledEditMessageTextPayload);
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

  it("should ignore voteban command if the feature is disabled", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toBeUndefined();
  });

  it("should not start voteban against itself", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanAgainstBotWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAgainstBotSendMessagePayload);
  });

  it("should not start voteban against the admin", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/getChatMember`, () =>
        HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "administrator", user } }),
      ),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAgainstAdminSendMessagePayload);
  });

  it("should reject duplicate votes", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    const [, voteban] = await prisma.$transaction([
      createDbUser(user),
      prisma.voteban.create({
        data: {
          authorId: adminUser.id,
          candidateId: user.id,
          chatId: supergroup.id,
          editorId: adminUser.id,
          messageId: 3,
        },
        select: { id: true },
      }),
    ]);
    await prisma.votebanNoBanVoter.create({
      data: { authorId: adminUser.id, editorId: adminUser.id, votebanId: voteban.id },
      select: { id: true },
    });

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteDuplicatedWebhookResponse);
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
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(ASYNC_REQUEST_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbSaveSettingsEditMessageTextPayloadFunc());
  });

  it("should say if there is no admin permissions", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanNoAdminPermsSendMessagePayload);
  });

  it("should say voteban command is not for a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanInPrivateChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual({ chat_id: privateChat.id, text: "This command is not for private chats." });
  });

  it("should start voteban", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: { message_id: 3 } });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanSendMessagePayload);
  });

  it("should tell how to use the voteban command correctly", async () => {
    await createDbSupergroupChat({ votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.votebanWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanWithoutReplySendMessagePayload);
  });
});
