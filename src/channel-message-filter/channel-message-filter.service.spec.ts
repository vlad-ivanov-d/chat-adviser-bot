import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";
import { store } from "src/utils/redis";

import { ChannelMessageFilterService } from "./channel-message-filter.service";

describe("ChannelMessageFilterService", () => {
  let service: ChannelMessageFilterService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TELEGRAM_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [ChannelMessageFilterService],
    }).compile();

    service = testingModule.get<ChannelMessageFilterService>(ChannelMessageFilterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
