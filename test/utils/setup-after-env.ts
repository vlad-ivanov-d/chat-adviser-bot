import { http, HttpResponse, type HttpResponseResolver, passthrough, type PathParams } from "msw";
import { setupServer } from "msw/node";
import { WEBHOOK_PATH } from "src/app.constants";
import { cache } from "src/utils/cache";
import { group, privateChat, supergroup } from "test/fixtures/chats";
import { adminUser, bot, user } from "test/fixtures/users";
import { TELEGRAM_API_BASE_URL } from "test/utils/constants";

import { cleanupDb, prisma } from "./database";

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
const getChatMemberResolver: HttpResponseResolver<PathParams, { chat_id: number; user_id: number }> = async (info) => {
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
  ...(WEBHOOK_PATH ? [http.post(`**${WEBHOOK_PATH}`, passthrough)] : []),
  http.post(`${TELEGRAM_API_BASE_URL}/getChat`, getChatResolver),
  http.post(`${TELEGRAM_API_BASE_URL}/getChatAdministrators`, getChatAdministratorsResolver),
  http.post(`${TELEGRAM_API_BASE_URL}/getChatMember`, getChatMemberResolver),
  http.post(`${TELEGRAM_API_BASE_URL}/getChatMembersCount`, getChatMembersCountResolver),
  http.post(`${TELEGRAM_API_BASE_URL}/getMe`, () => HttpResponse.json({ ok: true, result: bot })),
  http.post(`${TELEGRAM_API_BASE_URL}/setWebhook`, () =>
    HttpResponse.json({ description: "Webhook was deleted", ok: true, result: true }),
  ),
);

// Start listeners
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that may be added during the tests, so they don't affect other tests.
afterEach(async () => {
  cache.clear();
  jest.useRealTimers();
  server.resetHandlers();
  await cleanupDb();
});

// Clean up after the tests are finished
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
