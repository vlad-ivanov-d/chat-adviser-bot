import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";
import { store } from "src/utils/redis";

import { TimeZoneService } from "./time-zone.service";

describe("TimeZoneService", () => {
  let service: TimeZoneService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TG_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [TimeZoneService],
    }).compile();

    service = testingModule.get<TimeZoneService>(TimeZoneService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
