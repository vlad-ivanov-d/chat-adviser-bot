import type { RedisStore } from "cache-manager-redis-yet";

import { store } from "src/utils/redis";

import { cleanupDb, prisma } from "./database";
import { server } from "./server";

let cache: RedisStore;

beforeAll(async () => {
  cache = await store();
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  jest.useRealTimers();
  server.resetHandlers();
  await cleanupDb();
});

afterAll(async () => {
  server.close();
  await Promise.all([cache.client.disconnect(), prisma.$disconnect()]);
});
