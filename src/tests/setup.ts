import { http, HttpHandler, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { prisma } from "utils/prisma";

/**
 * Base url for mocking API calls
 */
export const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/test`;

/**
 * MSW HTTP handlers
 */
const handlers: HttpHandler[] = [
  http.post(`${BASE_URL}/getChatMembersCount`, () => HttpResponse.json({ ok: true, result: 2 })),
  http.post(`${BASE_URL}/getMe`, () =>
    HttpResponse.json({
      ok: true,
      result: {
        can_join_groups: true,
        can_read_all_group_messages: true,
        first_name: "The Bot",
        id: 100_000,
        is_bot: true,
        supports_inline_queries: false,
        username: "the_bot",
      },
    }),
  ),
];

/**
 * MSW server
 */
export const server = setupServer(...handlers);

// Start listeners
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that may be added during the tests, so they don't affect other tests.
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
