import { App } from "app";
import { http, HttpHandler, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Telegraf } from "telegraf";

import { mockBot } from "./mockBot";

/**
 * Base url for mocking API calls
 */
export const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

/**
 * Runs bot updates
 * @param bot Telegraf bot instance
 * @returns App instance
 */
export const runAppUpdates = async (bot: Telegraf): Promise<App> => {
  const app = new App(bot);
  await app.init();

  const updates = await bot.telegram.getUpdates(50, 100, 0, []);
  for (const update of updates) {
    await bot.handleUpdate(update);
  }

  return app;
};

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
afterEach(() => {
  jest.restoreAllMocks();
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});
