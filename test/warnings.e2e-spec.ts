import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ChatType } from "@prisma/client";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import { channel, privateChat, supergroup } from "fixtures/chats";
import * as settingsFixtures from "fixtures/settings";
import { adminUser, bot, systemChannelBot, user } from "fixtures/users";
import * as fixtures from "fixtures/warnings";
import { AppModule } from "src/app.module";

import {
  TEST_ASYNC_DELAY,
  TEST_TELEGRAM_API_BASE_URL,
  TEST_WEBHOOK_BASE_URL,
  TEST_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat, createDbUser, prisma } from "./utils/database";
import { server } from "./utils/server";
import { sleep } from "./utils/sleep";

describe("WarningsModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("bans a user for 3 warnings", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    await prisma.$transaction([
      createDbUser(user),
      prisma.message.createMany({
        data: [{ authorId: user.id, chatId: supergroup.id, editorId: user.id, mediaGroupId: "100", messageId: 2 }],
      }),
      prisma.warning.createMany({
        data: [
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 1, userId: user.id },
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 2, userId: user.id },
        ],
      }),
    ]);
    let banChatMemberPayload;
    let deleteMessagesPayload;
    let sendMessagePayload1: unknown;
    let sendMessagePayload2: unknown;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/banChatMember`, async (info) => {
        banChatMemberPayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: true });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/deleteMessages`, async (info) => {
        deleteMessagesPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        const body = await info.request.json();
        sendMessagePayload2 = sendMessagePayload1 ? body : undefined;
        sendMessagePayload1 = sendMessagePayload1 ?? body;
        return HttpResponse.json({ ok: true, result: { message_id: 5 } });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnMediaGroupWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ chat_id: supergroup.id, message_id: 4, method: "deleteMessage" });
    await sleep(TEST_ASYNC_DELAY);
    expect(banChatMemberPayload).toEqual({ chat_id: supergroup.id, user_id: user.id });
    expect(sendMessagePayload1).toEqual(fixtures.warnSendMessagePayload);
    expect(sendMessagePayload2).toEqual(fixtures.banSendMessagePayload);

    jest.runOnlyPendingTimers();
    await sleep(TEST_ASYNC_DELAY);
    expect(deleteMessagesPayload).toEqual({ chat_id: supergroup.id, message_ids: [3, 2] });
  });

  it("bans a sender chat for 3 warnings", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    await prisma.$transaction([
      createDbUser(systemChannelBot),
      prisma.senderChat.create({
        data: {
          authorId: adminUser.id,
          editorId: adminUser.id,
          id: channel.id,
          title: channel.title,
          type: ChatType.CHANNEL,
          username: channel.username,
        },
      }),
      prisma.warning.createMany({
        data: [
          {
            authorId: adminUser.id,
            chatId: supergroup.id,
            editorId: adminUser.id,
            messageId: 1,
            senderChatId: channel.id,
            userId: systemChannelBot.id,
          },
          {
            authorId: adminUser.id,
            chatId: supergroup.id,
            editorId: adminUser.id,
            messageId: 2,
            senderChatId: channel.id,
            userId: systemChannelBot.id,
          },
        ],
      }),
    ]);
    let banChatSenderChatPayload;
    let deleteMessagesPayload;
    let sendMessagePayload1: unknown;
    let sendMessagePayload2: unknown;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/banChatSenderChat`, async (info) => {
        banChatSenderChatPayload = await info.request.json();
        return new HttpResponse(null, { status: 400 });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/deleteMessages`, async (info) => {
        deleteMessagesPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        const body = await info.request.json();
        sendMessagePayload2 = sendMessagePayload1 ? body : undefined;
        sendMessagePayload1 = sendMessagePayload1 ?? body;
        return HttpResponse.json({ ok: true, result: { message_id: 5 } });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnSenderChatWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ chat_id: supergroup.id, message_id: 4, method: "deleteMessage" });
    await sleep(TEST_ASYNC_DELAY);
    expect(banChatSenderChatPayload).toEqual({ chat_id: supergroup.id, sender_chat_id: channel.id });
    expect(sendMessagePayload1).toEqual(fixtures.warnSenderChatSendMessagePayload);
    expect(sendMessagePayload2).toBeUndefined();

    jest.runOnlyPendingTimers();
    await sleep(TEST_ASYNC_DELAY);
    expect(deleteMessagesPayload).toEqual({ chat_id: supergroup.id, message_ids: [3] });
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

  it("ignores /warn command if the feature is disabled", async () => {
    await createDbSupergroupChat();

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("ignores unknown callback", async () => {
    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbUnknownWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
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

    const expectedEditMessageTextPayload = fixtures.cbSaveSettingsEditMessageTextPayload();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(expectedEditMessageTextPayload);
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

    const expectedEditMessageTextPayload = fixtures.cbSaveIncorrectValueSettingsEditMessageTextPayload();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(expectedEditMessageTextPayload);
  });

  it("says /warn command is not for a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnInPrivateChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual({ chat_id: privateChat.id, text: "This command is not for private chats." });
  });

  it("says if the bot has no admin permissions", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatAdministrators`, () =>
        HttpResponse.json({ ok: true, result: [] }),
      ),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatMember`, () => new HttpResponse(null, { status: 400 })),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnBotHasNoAdminPermsSendMessagePayload);
  });

  it("says if the user has no admin permissions", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatAdministrators`, () =>
        HttpResponse.json({ ok: true, result: [{ is_anonymous: false, status: "administrator", user: bot }] }),
      ),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnUserHasNoAdminPermsSendMessagePayload);
  });

  it("should not fail without ban and delete message permissions", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    await prisma.$transaction([
      createDbUser(user),
      prisma.warning.createMany({
        data: [
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 1, userId: user.id },
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 2, userId: user.id },
        ],
      }),
    ]);
    let banChatMemberPayload;
    let deleteMessagesPayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/banChatMember`, async (info) => {
        banChatMemberPayload = await info.request.json();
        return new HttpResponse(null, { status: 400 });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/deleteMessages`, async (info) => {
        deleteMessagesPayload = await info.request.json();
        return new HttpResponse(null, { status: 400 });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, () =>
        HttpResponse.json({ ok: true, result: { message_id: 5 } }),
      ),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ chat_id: supergroup.id, message_id: 4, method: "deleteMessage" });
    await sleep(TEST_ASYNC_DELAY);
    expect(banChatMemberPayload).toEqual({ chat_id: supergroup.id, user_id: user.id });

    jest.runOnlyPendingTimers();
    await sleep(TEST_ASYNC_DELAY);
    expect(deleteMessagesPayload).toEqual({ chat_id: supergroup.id, message_ids: [3] });
  });

  it("should not issue a warning against the admin", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatMember`, () =>
        HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "administrator", user } }),
      ),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnAgainstAdminSendMessagePayload);
  });

  it("should not issue a warning against the bot itself", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnAgainstBotWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnAgainstBotSendMessagePayload);
  });

  it("should not issue a warning against the linked channel", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnAgainstLinkedChannelWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnAgainstAdminSendMessagePayload);
  });

  it("should not issue duplicate warnings", async () => {
    await createDbSupergroupChat({ hasWarnings: true });
    await prisma.$transaction([
      createDbUser(user),
      prisma.warning.createMany({
        data: [
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 2, userId: user.id },
          { authorId: adminUser.id, chatId: supergroup.id, editorId: adminUser.id, messageId: 3, userId: user.id },
        ],
      }),
    ]);
    let deleteMessagesPayload;
    let sendMessagePayload: unknown;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/deleteMessages`, async (info) => {
        deleteMessagesPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: { message_id: 5 } });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.warnWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ chat_id: supergroup.id, message_id: 4, method: "deleteMessage" });
    await sleep(TEST_ASYNC_DELAY);
    expect(sendMessagePayload).toBeUndefined();

    jest.runOnlyPendingTimers();
    await sleep(TEST_ASYNC_DELAY);
    expect(deleteMessagesPayload).toEqual({ chat_id: supergroup.id, message_ids: [3] });
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

  it("tells how to use the /warn command correctly", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.warnWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.warnWithoutReplySendMessagePayload);
  });
});
