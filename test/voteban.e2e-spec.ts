import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ChatType, type Prisma } from "@prisma/client";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";

import { channel, privateChat, supergroup } from "fixtures/chats";
import * as settingsFixtures from "fixtures/settings";
import { adminUser, systemChannelBot, user } from "fixtures/users";
import * as fixtures from "fixtures/voteban";
import { AppModule } from "src/app.module";

import {
  TEST_ASYNC_DELAY,
  TEST_TG_API_BASE_URL,
  TEST_TG_WEBHOOK_BASE_URL,
  TEST_TG_WEBHOOK_PATH,
} from "./utils/constants";
import { createDbSupergroupChat, createDbUser, prisma } from "./utils/database";
import { server } from "./utils/server";
import { sleep } from "./utils/sleep";

describe("VotebanModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("accepts the vote", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbNoBanEditMessageTextPayload);
  });

  it("answers if the voting has expired", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteExpiredWebhookResponse);
  });

  it("bans by voting results", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    const voteban = await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    await prisma.votebanBanVoter.create({
      data: { authorId: user.id, editorId: user.id, votebanId: voteban.id },
      select: { id: true },
    });
    let banChatMemberPayload;
    let deleteMessagesPayload;
    let editMessageTextPayload;
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/banChatMember`, async (info) => {
        banChatMemberPayload = await info.request.json();
        return HttpResponse.json({}, { status: 400 });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/deleteMessages`, async (info) => {
        deleteMessagesPayload = await info.request.json();
        return HttpResponse.json({}, { status: 400 });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(banChatMemberPayload).toEqual({ chat_id: supergroup.id, user_id: user.id });
    expect(deleteMessagesPayload).toEqual({ chat_id: supergroup.id, message_ids: [1] });
    expect(editMessageTextPayload).toEqual(fixtures.cbBanEditMessageTextPayload);
    expect(sendMessagePayload).toEqual({ chat_id: 12, reply_parameters: { message_id: 3 }, text: "Voting completed" });
  });

  it("bans sender chat by voting results", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 45 });
    await createDbUser(systemChannelBot);
    await prisma.message.createMany({
      data: Array.from(Array(2)).map(
        (v, i): Prisma.MessageCreateManyInput => ({
          authorId: systemChannelBot.id,
          chatId: supergroup.id,
          editorId: systemChannelBot.id,
          mediaGroupId: "100",
          messageId: i + 1,
        }),
      ),
    });
    await prisma.senderChat.create({
      data: {
        authorId: adminUser.id,
        editorId: adminUser.id,
        id: channel.id,
        title: channel.title,
        type: ChatType.CHANNEL,
        username: channel.username,
      },
    });
    const voteban = await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: systemChannelBot.id,
        candidateMediaGroupId: "100",
        candidateMessageId: 1,
        candidateSenderChatId: channel.id,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 4,
      },
      select: { id: true },
    });
    await prisma.user.createMany({
      data: Array.from(Array(44)).map(
        (v, i): Prisma.UserCreateManyInput => ({
          authorId: i + 1000,
          editorId: i + 1000,
          firstName: `${user.first_name}${i.toString()}`,
          id: i + 1000,
          username: `${user.username ?? ""}${i.toString()}`,
        }),
      ),
    });
    await prisma.votebanBanVoter.createMany({
      data: Array.from(Array(44)).map(
        (v, i): Prisma.VotebanBanVoterCreateManyInput => ({
          authorId: i + 1000,
          editorId: i + 1000,
          votebanId: voteban.id,
        }),
      ),
    });
    let banChatSenderChatPayload;
    let deleteMessagesPayload;
    let editMessageTextPayload;
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/banChatSenderChat`, async (info) => {
        banChatSenderChatPayload = await info.request.json();
        return HttpResponse.json({}, { status: 400 });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/deleteMessages`, async (info) => {
        deleteMessagesPayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: true });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({}, { status: 400 });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbBanSenderChatWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(banChatSenderChatPayload).toEqual({ chat_id: supergroup.id, sender_chat_id: channel.id });
    expect(deleteMessagesPayload).toEqual({ chat_id: supergroup.id, message_ids: [1, 2] });
    expect(editMessageTextPayload).toEqual(fixtures.cbBanSenderChatEditMessageTextPayload);
    expect(sendMessagePayload).toEqual({ chat_id: 12, reply_parameters: { message_id: 4 }, text: "Voting completed" });
  });

  it("cancels the voting if cannot check the bot is an admin", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/getChatAdministrators`, () => HttpResponse.json({}, { status: 400 })),
    );
    const stderrWriteSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteBotNotAdminWebhookResponse);
    expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbCancelledBotNotAdminEditMessageTextPayload);
  });

  it("cancels the voting against the admin", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    await prisma.voteban.create({
      data: {
        authorId: user.id,
        candidateId: adminUser.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: user.id,
        messageId: 3,
      },
      select: { id: true },
    });
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbBanAgainstAdminWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbCancelledAgainstAdminEditMessageTextPayload);
  });

  it("cancels the voting if the feature is disabled", async () => {
    await createDbSupergroupChat();
    await createDbUser(user);
    await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(fixtures.cbCancelledEditMessageTextPayload);
  });

  it("handles an error if chat id is incorrect during settings rendering", async () => {
    const stderrWriteSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbSettingsErrorWebhook);
    expect(response.status).toBe(200);
    expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
  });

  it("handles an error if chat id is incorrect during settings saving", async () => {
    const stderrWriteSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsErrorWebhook);
    expect(response.status).toBe(200);
    expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores voteban command if the feature is disabled", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.votebanWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toBeUndefined();
  });

  it("rejects duplicate votes", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    const voteban = await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    await prisma.votebanNoBanVoter.create({
      data: { authorId: adminUser.id, editorId: adminUser.id, votebanId: voteban.id },
      select: { id: true },
    });

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteDuplicatedWebhookResponse);
  });

  it("rejects the vote of a user who is not a member of the chat", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    server.use(http.post(`${TEST_TG_API_BASE_URL}/getChatMember`, () => HttpResponse.json({}, { status: 400 })));

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbNotChatMemberWebhookResponse);
  });

  it("renders settings", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({}, { status: 400 });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ callback_query_id: "1", method: "answerCallbackQuery" });
    expect(editMessageTextPayload).toEqual(fixtures.cbSettingsEditMessageTextPayload);
  });

  it("renders settings with unsaved value", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({}, { status: 400 });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbUnsavedSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ callback_query_id: "1", method: "answerCallbackQuery" });
    expect(editMessageTextPayload).toEqual(fixtures.cbUnsavedSettingsEditMessageTextPayload);
  });

  it("saves settings", async () => {
    await createDbSupergroupChat();
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsWebhook);

    const expectedEditMessageTextPayload = fixtures.cbSaveSettingsEditMessageTextPayload();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSaveSettingsWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(expectedEditMessageTextPayload);
  });

  it("says if the bot is not an admin", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanNoAdminPermsSendMessagePayload);
  });

  it("says voteban command is not for a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.votebanInPrivateChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual({ chat_id: privateChat.id, text: "This command is not for private chats." });
  });

  it("should not accept votes from the chat from which it was kicked", async () => {
    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.cbNoBanWebhook);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixtures.answerCbVoteExpiredWebhookResponse);
  });

  it("should not render settings if the user is not an admin", async () => {
    let editMessageTextPayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
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
      http.post(`${TEST_TG_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${TEST_TG_API_BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.cbSaveSettingsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(settingsFixtures.answerCbSettingsNotAdminWebhookResponse);
    await sleep(TEST_ASYNC_DELAY);
    expect(editMessageTextPayload).toEqual(settingsFixtures.cbSettingsNotAdminEditMessageTextPayload);
  });

  it("should not start voteban if it has already been started", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    await createDbUser(user);
    await prisma.voteban.create({
      data: {
        authorId: adminUser.id,
        candidateId: user.id,
        candidateMessageId: 1,
        chatId: supergroup.id,
        editorId: adminUser.id,
        messageId: 3,
      },
      select: { id: true },
    });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAlreadyStartedSendMessagePayload);
  });

  it("should not start voteban against itself", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.votebanAgainstBotWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAgainstBotSendMessagePayload);
  });

  it("should not start voteban against the admin", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/getChatMember`, () =>
        HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "administrator", user } }),
      ),
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAgainstAdminSendMessagePayload);
  });

  it("starts voteban", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: { message_id: 3 } });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL).post(TEST_TG_WEBHOOK_PATH).send(fixtures.votebanWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanSendMessagePayload);
  });

  it("starts voteban against sender chat", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: { message_id: 3 } });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.votebanAgainstSenderChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanAgainstSenderChatSendMessagePayload);
  });

  it("starts voteban by sender chat command", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true, result: { message_id: 3 } });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.votebanSenderChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanSenderChatSendMessagePayload);
  });

  it("tells how to use the voteban command correctly", async () => {
    await createDbSupergroupChat(undefined, { votebanLimit: 2 });
    let sendMessagePayload;
    server.use(
      http.post(`${TEST_TG_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_TG_WEBHOOK_BASE_URL)
      .post(TEST_TG_WEBHOOK_PATH)
      .send(fixtures.votebanWithoutReplyWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.votebanWithoutReplySendMessagePayload);
  });
});
