import type { RedisStore } from "cache-manager-redis-yet";

import { store } from "src/utils/redis";

import { cleanupDb, prisma } from "./database";
import { server } from "./server";

let cache: RedisStore;

beforeAll(async () => {
  cache = await store();
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  // Fix "The client is closed" issue: prevents the cache client quit after each test
  jest.spyOn(cache.client, "quit").mockImplementation();
});

afterEach(async () => {
  jest.useRealTimers();
  server.resetHandlers();
  await cleanupDb();
});

afterAll(async () => {
  server.close();
  // Restore mocks. One of them prevents cache client quit.
  jest.restoreAllMocks();
  await Promise.all([cache.client.quit(), prisma.$disconnect()]);
});
