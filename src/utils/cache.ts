export class Cache {
  private store = new Map<string, { expired?: Date; value: unknown }>();

  /**
   * Removes all key/value pairs, if there are any.
   */
  public clear(): void {
    this.store = new Map();
  }

  /**
   * Returns the current value associated with the given key, or null if the given key does not exist.
   * @param key Cache key
   * @returns Data if it's in the cache
   */
  public getItem<T>(key: string): T | null {
    // Delete outdated keys first
    for (const [storeKey, { expired }] of this.store) {
      if (expired && Date.now() > expired.getTime()) {
        this.store.delete(storeKey);
      }
    }
    const cacheData = this.store.get(key);
    // Allow type assertion here to provide a better experience in working with this cache utility
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return cacheData ? (cacheData.value as T) : null;
  }

  /**
   * Iterates through cache storage.
   * @param callback Callback which will be executed on each cache key
   */
  public forEach<T>(callback: (key: string, value: T) => void): void {
    for (const [key, { expired, value }] of this.store) {
      // Delete outdated keys first
      if (expired && Date.now() > expired.getTime()) {
        this.store.delete(key);
        continue;
      }
      // Allow type assertion here to provide a better experience in working with this cache utility
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      callback(key, value as T);
    }
  }

  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   * @param key Cache key
   */
  public removeItem(key: string): void {
    this.store.delete(key);
  }

  /**
   * Sets the value of the pair identified by key to value,
   * creating a new key/value pair if none existed for key previously.
   * @param key Cache key
   * @param value Data
   * @param ttl Time to live in milliseconds
   */
  public setItem<T>(key: string, value: T, ttl?: number): void {
    this.store.set(key, { expired: typeof ttl === "number" ? new Date(Date.now() + ttl) : undefined, value });
  }
}

export const cache = new Cache();
