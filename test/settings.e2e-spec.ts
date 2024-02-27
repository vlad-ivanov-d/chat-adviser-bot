import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { http, HttpResponse } from "msw";
import request from "supertest";
import type { App } from "supertest/types";
import { server } from "test/utils/server";

import { AppModule } from "../src/app.module";
import * as fixtures from "./fixtures/settings";
import { TELEGRAM_API_BASE_URL, TEST_WEBHOOK_BASE_URL, TEST_WEBHOOK_PATH } from "./utils/constants";
import { createDbPrivateChat } from "./utils/database";

describe("SettingsModule (e2e)", () => {
  let app: INestApplication<App>;

  afterEach(() => app.close());

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("should not render chats as an answer to /mychats command in a supergroup chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.myChatsInSupergroupWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.myChatsInSupergroupSendMessagePayload);
  });

  it("should prompt admin to make settings when adding the bot to a new chat", async () => {
    await createDbPrivateChat();
    let sendMessagePayload1: unknown;
    let sendMessagePayload2: unknown;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        const body = await info.request.json();
        sendMessagePayload2 = sendMessagePayload1 ? body : undefined;
        sendMessagePayload1 = sendMessagePayload1 ?? body;
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.addedToNewChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload1).toEqual(fixtures.addedToNewChatSendMessagePayload1);
    expect(sendMessagePayload2).toEqual(fixtures.addedToNewChatSendMessagePayload2);
  });

  it("should prompt admin to make settings when a new group chat has been created", async () => {
    await createDbPrivateChat();
    let sendMessagePayload1: unknown;
    let sendMessagePayload2: unknown;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        const body = await info.request.json();
        sendMessagePayload2 = sendMessagePayload1 ? body : undefined;
        sendMessagePayload1 = sendMessagePayload1 ?? body;
        return HttpResponse.json({ ok: true });
      }),
    );

    // This event contains 2 separate updates
    const response1 = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.groupCreatedWebhook1);
    const response2 = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.groupCreatedWebhook2);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(sendMessagePayload1).toEqual(fixtures.addedToNewChatSendMessagePayload1);
    expect(sendMessagePayload2).toEqual(fixtures.groupCreatedSendMessagePayload);
  });

  it("should refresh chats", async () => {
    let editMessageTextPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbRefreshWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ callback_query_id: "1", method: "answerCallbackQuery" });
    expect(editMessageTextPayload).toEqual(fixtures.cbRefreshEditMessageTextPayload);
  });

  it("should render chats as an answer to /mychats command in a private chat", async () => {
    let sendMessagePayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, async (info) => {
        sendMessagePayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL)
      .post(TEST_WEBHOOK_PATH)
      .send(fixtures.myChatsInPrivateChatWebhook);

    expect(response.status).toBe(200);
    expect(sendMessagePayload).toEqual(fixtures.myChatsInPrivateChatSendMessagePayload);
  });

  it("should render the second page of chats", async () => {
    let editMessageTextPayload;
    server.use(
      http.post(`${TELEGRAM_API_BASE_URL}/editMessageText`, async (info) => {
        editMessageTextPayload = await info.request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const response = await request(TEST_WEBHOOK_BASE_URL).post(TEST_WEBHOOK_PATH).send(fixtures.cbChatsWebhook);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ callback_query_id: "1", method: "answerCallbackQuery" });
    expect(editMessageTextPayload).toEqual(fixtures.cbChatsEditMessageTextPayload);
  });
});
