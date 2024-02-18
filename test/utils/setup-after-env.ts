import { cache } from "src/utils/cache";

import { cleanupDb, prisma } from "./database";
import { server } from "./server";

// Start listeners
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that may be added during the tests, so they don't affect other tests.
afterEach(async () => {
  jest.useRealTimers();
  server.resetHandlers();
  await Promise.all([cache.reset(), cleanupDb()]);
});

// Clean up after the tests are finished
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
