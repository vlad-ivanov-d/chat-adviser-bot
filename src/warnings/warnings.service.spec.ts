import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";
import { store } from "src/utils/redis";

import { WarningsService } from "./warnings.service";

describe("WarningsService", () => {
  let service: WarningsService;

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
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [WarningsService],
    }).compile();

    service = testingModule.get<WarningsService>(WarningsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
