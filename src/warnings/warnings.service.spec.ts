import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { WarningsService } from "./warnings.service";

describe("WarningsService", () => {
  let service: WarningsService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [WarningsService],
    }).compile();

    service = testingModule.get<WarningsService>(WarningsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
