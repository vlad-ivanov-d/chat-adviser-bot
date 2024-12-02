import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";
import { store } from "src/utils/redis";

import { SummaryService } from "./summary.service";

describe("SummaryService", () => {
  let service: SummaryService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TG_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [SummaryService],
    }).compile();

    service = testingModule.get<SummaryService>(SummaryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
