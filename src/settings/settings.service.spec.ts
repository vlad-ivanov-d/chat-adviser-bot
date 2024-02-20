import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { PrismaModule } from "src/prisma/prisma.module";
import { cache } from "src/utils/cache";

import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  let service: SettingsService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store: cache }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
        PrismaModule,
      ],
      providers: [SettingsService],
    }).compile();

    service = testingModule.get<SettingsService>(SettingsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
