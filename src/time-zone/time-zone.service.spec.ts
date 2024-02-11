import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { TimeZoneService } from "./time-zone.service";

describe("TimeZoneService", () => {
  let service: TimeZoneService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [TimeZoneService],
    }).compile();

    service = testingModule.get<TimeZoneService>(TimeZoneService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
