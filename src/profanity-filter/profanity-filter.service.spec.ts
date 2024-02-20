import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";
import { cache } from "src/utils/cache";

import { ProfanityFilterService } from "./profanity-filter.service";

describe("ProfanityFilterService", () => {
  let service: ProfanityFilterService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store: cache }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [ProfanityFilterService],
    }).compile();

    service = testingModule.get<ProfanityFilterService>(ProfanityFilterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
