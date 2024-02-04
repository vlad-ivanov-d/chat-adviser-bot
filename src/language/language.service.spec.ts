import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { LanguageService } from "./language.service";

describe("LanguageService", () => {
  let service: LanguageService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [LanguageService],
    }).compile();

    service = testingModule.get<LanguageService>(LanguageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
