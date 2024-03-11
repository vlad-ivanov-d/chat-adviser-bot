import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { store } from "src/utils/redis";

import { AppService } from "./app.service";

describe("AppService", () => {
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

    service = testingModule.get<AppService>(AppService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
