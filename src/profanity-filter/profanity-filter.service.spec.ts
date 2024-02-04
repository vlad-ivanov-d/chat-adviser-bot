import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { ProfanityFilterService } from "./profanity-filter.service";

describe("ProfanityFilterService", () => {
  let service: ProfanityFilterService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [ProfanityFilterService],
    }).compile();

    service = testingModule.get<ProfanityFilterService>(ProfanityFilterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
