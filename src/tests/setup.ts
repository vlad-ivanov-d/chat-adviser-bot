import { initBot } from "app";
import { http, HttpHandler, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Telegraf } from "telegraf";
import { prisma } from "utils/prisma";

import { mockBot } from "./mockBot";

/**
 * Base url for mocking API calls
 */
export const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

/**
 * Initiates bot features and runs updates
 * @param bot Telegraf bot
 * @returns Telegraf bot with all the features
 */
export const initBotAndRunUpdates = async (bot: Telegraf): Promise<Telegraf> => {
  initBot(bot);
  const updates = await bot.telegram.getUpdates(50, 100, 0, []);
  for (const update of updates) {
    await bot.handleUpdate(update);
  }
  return bot;
};

/**
 * MSW HTTP handlers
 */
const handlers: HttpHandler[] = [
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
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
