import { CACHE_MANAGER, CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import type { Cache as CacheManager } from "cache-manager";

import { AppService } from "./app.service";
import { store } from "./utils/redis";

describe("AppService", () => {
  let cacheManager: CacheManager;
  let service: AppService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          /**
           * Initiates Redis store
           * @returns Cache manager with Redis store
           */
          useFactory: () => ({ store }),
        }),
      ],
      providers: [AppService],
    }).compile();

    cacheManager = testingModule.get<CacheManager>(CACHE_MANAGER);
    service = testingModule.get<AppService>(AppService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("resets cache store", async () => {
    const resetSpy = jest.spyOn(cacheManager, "reset");
    await service.onApplicationBootstrap();
    expect(resetSpy).toHaveBeenCalledWith();
  });
});
