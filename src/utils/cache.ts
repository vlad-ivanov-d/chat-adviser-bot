import { createCache, memoryStore } from "cache-manager";

const internalCache = createCache(memoryStore());

/**
 * Cache instance to use in the app and tests
 */
export const cache = {
  ...internalCache,
  /**
   * Workaround for undefined keys() method
   * @returns Array of keys
   */
  keys: () => internalCache.store.keys(),
};
