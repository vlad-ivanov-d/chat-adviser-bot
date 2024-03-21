import { http, HttpResponse, type HttpResponseResolver, passthrough, type PathParams } from "msw";
import { setupServer } from "msw/node";

import { group, privateChat, supergroup } from "fixtures/chats";
import { adminUser, bot, user } from "fixtures/users";

import { TEST_TELEGRAM_API_BASE_URL } from "./constants";

/**
 * Resolves response for /getChatAdministrators endpoint.
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatAdministratorsResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  const { chat_id: chatId } = await info.request.json();
  return HttpResponse.json({
    ok: true,
    result:
      chatId === privateChat.id
        ? []
        : [
            { is_anonymous: false, status: "creator", user: adminUser },
            { is_anonymous: false, status: "administrator", user: bot },
          ],
  });
};

/**
 * Resolves response for /getChatMember endpoint.
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatMemberResolver: HttpResponseResolver<PathParams, { user_id: number }> = async (info) => {
  const { user_id: userId } = await info.request.json();
  if (userId === adminUser.id) {
    return HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "creator", user: adminUser } });
  }
  return HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "member", user } });
};

/**
 * Resolves response for /getChatMembersCount endpoint.
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatMembersCountResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  const { chat_id: chatId } = await info.request.json();
  return HttpResponse.json({ ok: true, result: chatId === privateChat.id ? 2 : 3 });
};

/**
 * Resolves response for /getChat endpoint.
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  const { chat_id: chatId } = await info.request.json();
  switch (chatId) {
    case group.id:
      return HttpResponse.json({ ok: true, result: group });
    case supergroup.id:
    default:
      return HttpResponse.json({ ok: true, result: supergroup });
  }
};

/**
 * MSW server
 */
export const server = setupServer(
  ...(process.env.WEBHOOK_PATH ? [http.post(`**${process.env.WEBHOOK_PATH}`, passthrough)] : []),
  http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChat`, getChatResolver),
  http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatAdministrators`, getChatAdministratorsResolver),
  http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatMember`, getChatMemberResolver),
  http.post(`${TEST_TELEGRAM_API_BASE_URL}/getChatMembersCount`, getChatMembersCountResolver),
  http.post(`${TEST_TELEGRAM_API_BASE_URL}/getMe`, () => HttpResponse.json({ ok: true, result: bot })),
  http.post(`${TEST_TELEGRAM_API_BASE_URL}/setWebhook`, () => HttpResponse.json({ ok: true, result: true })),
);
