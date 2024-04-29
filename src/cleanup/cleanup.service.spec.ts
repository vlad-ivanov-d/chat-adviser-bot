import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { store } from "src/utils/redis";

import { CleanupService } from "./cleanup.service";

describe("CleanupService", () => {
  let service: CleanupService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TELEGRAM_TOKEN ?? "" }),
        PrismaModule,
      ],
      providers: [CleanupService],
    }).compile();

    service = testingModule.get<CleanupService>(CleanupService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
