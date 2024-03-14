import type { RedisStore } from "cache-manager-redis-yet";

import { store } from "src/utils/redis";

let cache: RedisStore;

beforeAll(async () => {
  cache = await store();
});

afterEach(() => {
  jest.useRealTimers();
});

// Close connections after all tests
afterAll(() => cache.client.disconnect());
