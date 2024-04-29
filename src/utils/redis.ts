import { type RedisStore, redisStore } from "cache-manager-redis-yet";

let cache: RedisStore | undefined;

/**
 * Initiates Redis store
 * @returns Redis store
 */
export const store = async (): Promise<RedisStore> => {
  cache =
    cache ??
    (await redisStore({
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      },
    }));
  return cache;
};
