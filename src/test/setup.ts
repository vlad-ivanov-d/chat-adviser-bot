import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { cache } from "utils/cache";

import { mockBot } from "./mockBot";
import { cleanupDb, prisma } from "./mockDatabase";

/**
 * Base url for mocking API calls
 */
export const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

/**
 * MSW server
 */
export const server = setupServer(
  http.post(`${BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
  http.post(`${BASE_URL}/getChatMembersCount`, () => HttpResponse.json({ ok: true, result: 2 })),
  http.post(`${BASE_URL}/getMe`, () => HttpResponse.json({ ok: true, result: mockBot() })),
);

// Start listeners
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that may be added during the tests, so they don't affect other tests.
afterEach(async () => {
  cache.clear();
  jest.restoreAllMocks();
  server.resetHandlers();
  await cleanupDb();
});

// Clean up after the tests are finished
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
