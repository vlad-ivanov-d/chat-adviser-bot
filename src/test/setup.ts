import { http, HttpHandler, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { cleanupDb, prisma } from "./database";
import { mockBot } from "./mockBot";

/**
 * Base url for mocking API calls
 */
export const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

/**
 * MSW HTTP handlers
 */
const handlers: HttpHandler[] = [
  http.post(`${BASE_URL}/getChatAdministrators`, () => HttpResponse.json({ ok: true, result: [] })),
  http.post(`${BASE_URL}/getChatMembersCount`, () => HttpResponse.json({ ok: true, result: 2 })),
  http.post(`${BASE_URL}/getMe`, () => HttpResponse.json({ ok: true, result: mockBot() })),
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
afterEach(async () => {
  jest.restoreAllMocks();
  server.resetHandlers();
  await cleanupDb();
});

// Clean up after the tests are finished
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
