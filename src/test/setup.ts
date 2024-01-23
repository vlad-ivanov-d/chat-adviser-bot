import { http, HttpResponse, type HttpResponseResolver, type PathParams } from "msw";
import { setupServer } from "msw/node";
import { cache } from "utils/cache";

import { BASE_URL } from "./constants";
import { mockBot } from "./mockBot";
import { mockGroupChat, mockPrivateChat, mockSupergroupChat } from "./mockChat";
import { cleanupDb, prisma } from "./mockDatabase";
import { mockAdminUser, mockUser } from "./mockUser";

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
      chatId === mockPrivateChat().id
        ? []
        : [
            { is_anonymous: false, status: "creator", user: mockAdminUser() },
            { is_anonymous: false, status: "administrator", user: mockBot() },
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
  if (userId === mockAdminUser().id) {
    return HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "creator", user: mockAdminUser() } });
  }
  return HttpResponse.json({ ok: true, result: { is_anonymous: false, status: "member", user: mockUser() } });
};

/**
 * Resolves response for /getChatMembersCount endpoint.
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatMembersCountResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  const { chat_id: chatId } = await info.request.json();
  return HttpResponse.json({ ok: true, result: chatId === mockPrivateChat().id ? 2 : 3 });
};

/**
 * Resolves response for /getChat endpoint.
 * @param info Resolver info
 * @returns HTTP response
 */
const getChatResolver: HttpResponseResolver<PathParams, { chat_id: number }> = async (info) => {
  const { chat_id: chatId } = await info.request.json();
  switch (chatId) {
    case mockGroupChat().id:
      return HttpResponse.json({ ok: true, result: mockGroupChat() });
    case mockSupergroupChat().id:
    default:
      return HttpResponse.json({ ok: true, result: mockSupergroupChat() });
  }
};

/**
 * MSW server
 */
export const server = setupServer(
  http.post(`${BASE_URL}/getChat`, getChatResolver),
  http.post(`${BASE_URL}/getChatAdministrators`, getChatAdministratorsResolver),
  http.post(`${BASE_URL}/getChatMember`, getChatMemberResolver),
  http.post(`${BASE_URL}/getChatMembersCount`, getChatMembersCountResolver),
  http.post(`${BASE_URL}/getMe`, () => HttpResponse.json({ ok: true, result: mockBot() })),
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
