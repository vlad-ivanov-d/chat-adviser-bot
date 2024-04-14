import { CACHE_MANAGER, CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import type { Cache as CacheManager } from "cache-manager";
import type { RedisStore } from "cache-manager-redis-yet";
import { TelegrafModule } from "nestjs-telegraf";

import { AppService } from "./app.service";
import { store } from "./utils/redis";

describe("AppService", () => {
  let cacheManager: CacheManager<RedisStore>;
  let service: AppService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
      ],
      providers: [AppService],
    }).compile();

    cacheManager = testingModule.get<CacheManager<RedisStore>>(CACHE_MANAGER);
    service = testingModule.get<AppService>(AppService);
  });

  it("closes cache client", async () => {
    const quitSpy = jest.spyOn(cacheManager.store.client, "quit");
    await service.onApplicationShutdown();
    expect(quitSpy).toHaveBeenCalledWith();
  });

  it("resets cache store", async () => {
    const resetSpy = jest.spyOn(cacheManager, "reset");
    await service.onApplicationBootstrap();
    expect(resetSpy).toHaveBeenCalledWith();
  });
});
