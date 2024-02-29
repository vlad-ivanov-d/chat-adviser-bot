import type { RedisStore } from "cache-manager-redis-yet";
import { store } from "src/utils/redis";

import { cleanupDb, prisma } from "./database";
import { server } from "./server";

let cache: RedisStore;

// Start listeners
beforeAll(async () => {
  cache = await store();
  server.listen({ onUnhandledRequest: "error" });
});

// Cleanup after each test
afterEach(async () => {
  jest.useRealTimers();
  server.resetHandlers();
  await Promise.all([cache.reset(), cleanupDb()]);
});

// Close connections after all tests
afterAll(async () => {
  server.close();
  await Promise.all([cache.client.disconnect(), prisma.$disconnect()]);
});
